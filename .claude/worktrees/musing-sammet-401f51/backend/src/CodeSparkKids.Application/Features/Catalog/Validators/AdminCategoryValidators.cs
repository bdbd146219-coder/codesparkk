using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Catalog;
using FluentValidation;

namespace CodeSparkKids.Application.Features.Catalog.Validators;

public sealed class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
{
    public CreateCategoryRequestValidator()
    {
        RuleFor(x => x.NameEn).NotEmpty().MaximumLength(120);
        RuleFor(x => x.NameAr!).MaximumLength(120).When(x => x.NameAr is not null);
        RuleFor(x => x.DescriptionEn!).MaximumLength(500).When(x => x.DescriptionEn is not null);
        RuleFor(x => x.DescriptionAr!).MaximumLength(500).When(x => x.DescriptionAr is not null);
        RuleFor(x => x.Icon!).MaximumLength(80).When(x => x.Icon is not null);
        RuleFor(x => x.Order!.Value).GreaterThanOrEqualTo(0).When(x => x.Order.HasValue);
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
    }
}

public sealed class UpdateCategoryRequestValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.NameEn).NotEmpty().MaximumLength(120);
        RuleFor(x => x.NameAr!).MaximumLength(120).When(x => x.NameAr is not null);
        RuleFor(x => x.DescriptionEn!).MaximumLength(500).When(x => x.DescriptionEn is not null);
        RuleFor(x => x.DescriptionAr!).MaximumLength(500).When(x => x.DescriptionAr is not null);
        RuleFor(x => x.Icon!).MaximumLength(80).When(x => x.Icon is not null);
        RuleFor(x => x.Order).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
    }
}
