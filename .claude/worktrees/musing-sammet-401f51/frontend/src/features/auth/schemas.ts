import { z } from 'zod';

/**
 * i18n message keys returned by Zod. The UI calls `t(issue.message)` so
 * validation messages localise correctly. Never put English text here.
 */

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 32) return true;
  }
  return false;
}

export const passwordRule = z
  .string({ required_error: 'auth.errors.passwordRequired' })
  .min(12, { message: 'auth.errors.passwordTooShort' })
  .max(128, { message: 'auth.errors.passwordTooLong' })
  .refine(passwordHasThreeOfFour, { message: 'auth.errors.passwordComplexity' });

export const emailRule = z
  .string({ required_error: 'auth.errors.emailRequired' })
  .min(1, { message: 'auth.errors.emailRequired' })
  .email({ message: 'auth.errors.emailInvalid' })
  .max(254, { message: 'auth.errors.emailTooLong' });

export const displayNameRule = z
  .string({ required_error: 'auth.errors.displayNameRequired' })
  .min(1, { message: 'auth.errors.displayNameRequired' })
  .max(80, { message: 'auth.errors.displayNameTooLong' })
  .refine((value) => !hasControlChars(value), {
    message: 'auth.errors.displayNameControlChars',
  });

export const localeRule = z.enum(['en', 'ar'], {
  errorMap: () => ({ message: 'auth.errors.localeUnsupported' }),
});

export const registerSchema = z
  .object({
    email: emailRule,
    password: passwordRule,
    confirmPassword: z.string().min(1, { message: 'auth.errors.confirmPasswordRequired' }),
    displayName: displayNameRule,
    preferredLocale: localeRule,
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'auth.errors.termsRequired' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMismatch',
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailRule,
  password: z
    .string({ required_error: 'auth.errors.passwordRequired' })
    .min(1, { message: 'auth.errors.passwordRequired' })
    .max(128, { message: 'auth.errors.passwordTooLong' }),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailRule });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, { message: 'auth.errors.confirmPasswordRequired' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMismatch',
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({ email: emailRule });
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

export function passwordHasThreeOfFour(password: string): boolean {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^a-zA-Z0-9]/.test(password)) classes += 1;
  return classes >= 3;
}
