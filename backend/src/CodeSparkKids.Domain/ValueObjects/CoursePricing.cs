using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Domain.ValueObjects;

/// <summary>
/// Pricing for a course. This phase only activates <see cref="PricingModel.Free"/>;
/// <see cref="OneTime"/> and <see cref="Subscription"/> shapes are modelled so the
/// schema is ready, but they carry NO payment, tax, or billing logic — that is
/// out of scope for the domain foundation.
/// </summary>
public sealed class CoursePricing : IEquatable<CoursePricing>
{
    public PricingModel Model { get; private set; }

    /// <summary>Price amount; <c>null</c> for free courses.</summary>
    public decimal? Amount { get; private set; }

    /// <summary>ISO 4217 currency code (e.g. "USD"); <c>null</c> for free courses.</summary>
    public string? Currency { get; private set; }

    private CoursePricing() { }

    private CoursePricing(PricingModel model, decimal? amount, string? currency)
    {
        Model = model;
        Amount = amount;
        Currency = currency;
    }

    public static CoursePricing Free() => new(PricingModel.Free, null, null);

    public static CoursePricing OneTime(decimal amount, string currency) =>
        new(PricingModel.OneTime, ValidateAmount(amount), ValidateCurrency(currency));

    public static CoursePricing Subscription(decimal amount, string currency) =>
        new(PricingModel.Subscription, ValidateAmount(amount), ValidateCurrency(currency));

    public bool IsFree => Model == PricingModel.Free;

    private static decimal ValidateAmount(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Paid pricing requires a positive amount.");
        return amount;
    }

    private static string ValidateCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency) || currency.Trim().Length != 3)
            throw new ArgumentException("Currency must be a 3-letter ISO code.", nameof(currency));
        return currency.Trim().ToUpperInvariant();
    }

    public bool Equals(CoursePricing? other) =>
        other is not null && Model == other.Model && Amount == other.Amount && Currency == other.Currency;

    public override bool Equals(object? obj) => Equals(obj as CoursePricing);

    public override int GetHashCode() => HashCode.Combine(Model, Amount, Currency);
}
