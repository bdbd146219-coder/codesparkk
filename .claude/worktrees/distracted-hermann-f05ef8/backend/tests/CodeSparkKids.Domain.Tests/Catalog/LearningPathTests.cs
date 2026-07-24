using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Tests.Catalog;

public class LearningPathTests
{
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static LearningPath NewPath() =>
        LearningPath.Create("Junior Coder Journey",
            LocalizedText.Create("Junior Coder Journey", "رحلة المبرمج الصغير"), AgeBand.Junior, Now);

    [Fact]
    public void Create_normalizes_slug_and_starts_draft()
    {
        var path = NewPath();
        Assert.Equal("junior-coder-journey", path.Slug);
        Assert.Equal(CoursePublishState.Draft, path.PublishState);
        Assert.False(path.IsListed);
    }

    [Fact]
    public void Publish_requires_complete_title_and_at_least_one_item()
    {
        var path = NewPath();
        Assert.Throws<InvalidOperationException>(() => path.Publish(Now)); // no items

        path.AddItem(Guid.NewGuid(), null, Now);
        path.Publish(Now);
        Assert.Equal(CoursePublishState.Published, path.PublishState);
        Assert.True(path.IsListed);
    }

    [Fact]
    public void Items_are_ordered_and_resequenced()
    {
        var path = NewPath();
        var a = path.AddItem(Guid.NewGuid(), "first", Now);
        var b = path.AddItem(Guid.NewGuid(), null, Now);
        var c = path.AddItem(Guid.NewGuid(), null, Now);
        Assert.Equal(new[] { 0, 1, 2 }, path.Items.Select(i => i.Order));

        path.ReorderItems(new[] { c.Id, a.Id, b.Id }, Now);
        Assert.Equal(new[] { c.Id, a.Id, b.Id }, path.Items.Select(i => i.Id));

        path.RemoveItem(c.Id, Now);
        Assert.Equal(new[] { 0, 1 }, path.Items.Select(i => i.Order));
    }

    [Fact]
    public void SoftDelete_blocks_publish()
    {
        var path = NewPath();
        path.AddItem(Guid.NewGuid(), null, Now);
        path.SoftDelete(Now);
        Assert.True(path.IsDeleted);
        Assert.Throws<InvalidOperationException>(() => path.Publish(Now));
    }
}
