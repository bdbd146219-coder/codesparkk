namespace CodeSparkKids.Infrastructure.FileStorage;

public sealed class LocalDiskFileStorageOptions
{
    public const string SectionName = "FileStorage:LocalDisk";

    public string RootPath { get; set; } = "storage";
}
