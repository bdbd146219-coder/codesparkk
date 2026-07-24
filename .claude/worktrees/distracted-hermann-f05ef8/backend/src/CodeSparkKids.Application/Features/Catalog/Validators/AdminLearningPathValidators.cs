using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Catalog;
using FluentValidation;

namespace CodeSparkKids.Application.Features.Catalog.Validators;

public sealed class CreateLearningPathRequestValidator : AbstractValidator<CreateLearningPathRequest>
{
    public CreateLearningPathRequestValidator()
    {
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.SummaryEn!).MaximumLength(500).When(x => x.SummaryEn is not null);
        RuleFor(x => x.SummaryAr!).MaximumLength(500).When(x => x.SummaryAr is not null);
        RuleFor(x => x.AgeBand).MustBeEnum<CreateLearningPathRequest, AgeBand>();
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
    }
}

public sealed class UpdateLearningPathRequestValidator : AbstractValidator<UpdateLearningPathRequest>
{
    public UpdateLearningPathRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.SummaryEn!).MaximumLength(500).When(x => x.SummaryEn is not null);
        RuleFor(x => x.SummaryAr!).MaximumLength(500).When(x => x.SummaryAr is not null);
        RuleFor(x => x.AgeBand).MustBeEnum<UpdateLearningPathRequest, AgeBand>();
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
    }
}

public sealed class AddLearningPathItemRequestValidator : AbstractValidator<AddLearningPathItemRequest>
{
    public AddLearningPathItemRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.CourseId).NotEmpty();
        RuleFor(x => x.Note!).MaximumLength(300).When(x => x.Note is not null);
    }
}

public sealed class ReorderLearningPathItemsRequestValidator : AbstractValidator<ReorderLearningPathItemsRequest>
{
    public ReorderLearningPathItemsRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.OrderedItemIds).NotNull().NotEmpty().WithMessage("orderedItemIds is required.");
    }
}
