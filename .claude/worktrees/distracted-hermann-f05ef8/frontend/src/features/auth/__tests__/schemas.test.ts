import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordHasThreeOfFour,
  registerSchema,
  resetPasswordSchema,
} from '../schemas';

describe('passwordHasThreeOfFour', () => {
  it('rejects all-lowercase', () => {
    expect(passwordHasThreeOfFour('alllowercaseonly')).toBe(false);
  });
  it('rejects two-class combinations', () => {
    expect(passwordHasThreeOfFour('lowerandUPPER')).toBe(false);
    expect(passwordHasThreeOfFour('digitsAnd1234')).toBe(true); // 3 classes: lower, upper, digit
    expect(passwordHasThreeOfFour('1234567!@#$')).toBe(false); // digit + special only (2 classes)
  });
  it('accepts three-class and four-class', () => {
    expect(passwordHasThreeOfFour('Lower1234ABCD')).toBe(true);
    expect(passwordHasThreeOfFour('Lower1!@#$XYZ')).toBe(true);
  });
});

describe('registerSchema', () => {
  const valid = {
    email: 'parent@example.com',
    password: 'Sup3rStr0ng!Pass',
    confirmPassword: 'Sup3rStr0ng!Pass',
    displayName: 'Sara',
    preferredLocale: 'en' as const,
    acceptedTerms: true as const,
  };

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched passwords with the right message key', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'confirmPassword');
      expect(issue?.message).toBe('auth.errors.passwordMismatch');
    }
  });

  it('rejects unsupported locale', () => {
    const r = registerSchema.safeParse({ ...valid, preferredLocale: 'fr' });
    expect(r.success).toBe(false);
  });

  it('requires terms acceptance', () => {
    const r = registerSchema.safeParse({ ...valid, acceptedTerms: false });
    expect(r.success).toBe(false);
  });

  it('rejects weak password', () => {
    const r = registerSchema.safeParse({
      ...valid,
      password: 'alllowercase',
      confirmPassword: 'alllowercase',
    });
    expect(r.success).toBe(false);
  });

  it('rejects control chars in display name', () => {
    const r = registerSchema.safeParse({ ...valid, displayName: 'sarabell' });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid input', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('requires a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('requires matching strong passwords', () => {
    const ok = resetPasswordSchema.safeParse({
      password: 'New!Sup3rStr0ng',
      confirmPassword: 'New!Sup3rStr0ng',
    });
    expect(ok.success).toBe(true);
    const bad = resetPasswordSchema.safeParse({
      password: 'New!Sup3rStr0ng',
      confirmPassword: 'mismatch',
    });
    expect(bad.success).toBe(false);
  });
});
