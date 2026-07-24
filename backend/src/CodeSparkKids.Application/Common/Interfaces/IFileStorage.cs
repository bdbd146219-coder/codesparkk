namespace CodeSparkKids.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<string> SaveAsync(string container, string fileName, Stream content, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string container, string fileName, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(string container, string fileName, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string container, string fileName, CancellationToken cancellationToken = default);
}
