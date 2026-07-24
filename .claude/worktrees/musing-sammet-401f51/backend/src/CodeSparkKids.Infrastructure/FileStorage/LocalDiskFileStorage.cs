using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Infrastructure.FileStorage;

public sealed class LocalDiskFileStorage(IOptions<LocalDiskFileStorageOptions> options) : IFileStorage
{
    private readonly string _rootPath = Path.GetFullPath(options.Value.RootPath);

    public async Task<string> SaveAsync(string container, string fileName, Stream content, CancellationToken cancellationToken = default)
    {
        var (containerPath, filePath) = ResolvePath(container, fileName);
        Directory.CreateDirectory(containerPath);

        await using var fileStream = File.Create(filePath);
        await content.CopyToAsync(fileStream, cancellationToken);

        return filePath;
    }

    public Task<Stream?> OpenReadAsync(string container, string fileName, CancellationToken cancellationToken = default)
    {
        var (_, filePath) = ResolvePath(container, fileName);
        if (!File.Exists(filePath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = File.OpenRead(filePath);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> DeleteAsync(string container, string fileName, CancellationToken cancellationToken = default)
    {
        var (_, filePath) = ResolvePath(container, fileName);
        if (!File.Exists(filePath))
        {
            return Task.FromResult(false);
        }

        File.Delete(filePath);
        return Task.FromResult(true);
    }

    public Task<bool> ExistsAsync(string container, string fileName, CancellationToken cancellationToken = default)
    {
        var (_, filePath) = ResolvePath(container, fileName);
        return Task.FromResult(File.Exists(filePath));
    }

    private (string ContainerPath, string FilePath) ResolvePath(string container, string fileName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(container);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);

        var safeContainer = SanitizeSegment(container);
        var safeFileName = SanitizeSegment(fileName);

        var containerPath = Path.Combine(_rootPath, safeContainer);
        var filePath = Path.Combine(containerPath, safeFileName);

        var fullContainer = Path.GetFullPath(containerPath);
        var fullFile = Path.GetFullPath(filePath);

        if (!fullFile.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase) ||
            !fullContainer.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Resolved path escapes configured storage root.");
        }

        return (fullContainer, fullFile);
    }

    private static string SanitizeSegment(string value)
    {
        foreach (var invalid in Path.GetInvalidFileNameChars())
        {
            value = value.Replace(invalid, '_');
        }
        return value;
    }
}
