using CodeSparkKids.Application.Common.Interfaces;

namespace CodeSparkKids.Infrastructure.Common;

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}
