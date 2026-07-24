import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { registerSchema, type RegisterFormValues } from '../schemas';
import { readDevState } from '../utils/page-state';
import { SUPPORTED_LOCALES } from '@/i18n';

const STATES = ['empty', 'invalid', 'loading', 'success', 'server-error'] as const;
type State = (typeof STATES)[number];

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devState: State | null = readDevState(searchParams, STATES);

  const defaultLocale = (i18n.resolvedLanguage === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      preferredLocale: defaultLocale,
      acceptedTerms: false as unknown as true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      return authApi.register({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        displayName: values.displayName.trim(),
        preferredLocale: values.preferredLocale,
        acceptedTermsVersion: '2026-06-17',
        timeZone: detectTimeZone(),
      });
    },
    onSuccess: () => {
      navigate('/auth/verify-email-sent', { replace: true });
    },
  });

  // Force dev states without triggering real API calls.
  useEffect(() => {
    if (devState === 'invalid') {
      form.setError('email', { message: 'auth.errors.emailInvalid' });
      form.setError('password', { message: 'auth.errors.passwordTooShort' });
      form.setError('acceptedTerms', { message: 'auth.errors.termsRequired' });
    }
  }, [devState, form]);

  const isLoading = mutation.isPending || devState === 'loading';
  const apiError =
    devState === 'server-error'
      ? new ApiError(500, 'about:blank', 'auth.errors.server')
      : mutation.error instanceof ApiError
        ? mutation.error
        : null;
  const isSuccess = devState === 'success' || mutation.isSuccess;

  return (
    <AuthCard
      kickerKey="auth.register.kicker"
      titleKey="auth.register.title"
      descriptionKey="auth.register.description"
      footer={
        <span>
          {t('auth.register.haveAccount')}{' '}
          <Link
            to="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.register.signIn')}
          </Link>
        </span>
      }
    >
      {isSuccess ? (
        <SuccessNotice />
      ) : (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <FormField
            id="reg-displayName"
            labelKey="auth.fields.displayName"
            required
            errorKey={form.formState.errors.displayName?.message ?? undefined}
            hintKey="auth.hints.displayName"
          >
            <Input
              id="reg-displayName"
              autoComplete="name"
              aria-invalid={!!form.formState.errors.displayName}
              {...form.register('displayName')}
            />
          </FormField>

          <FormField
            id="reg-email"
            labelKey="auth.fields.email"
            required
            errorKey={form.formState.errors.email?.message ?? undefined}
          >
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
          </FormField>

          <FormField
            id="reg-password"
            labelKey="auth.fields.password"
            required
            errorKey={form.formState.errors.password?.message ?? undefined}
            hintKey="auth.hints.password"
          >
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
          </FormField>

          <FormField
            id="reg-confirmPassword"
            labelKey="auth.fields.confirmPassword"
            required
            errorKey={form.formState.errors.confirmPassword?.message ?? undefined}
          >
            <Input
              id="reg-confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register('confirmPassword')}
            />
          </FormField>

          <FormField
            id="reg-preferredLocale"
            labelKey="auth.fields.preferredLocale"
            required
            errorKey={form.formState.errors.preferredLocale?.message ?? undefined}
          >
            <select
              id="reg-preferredLocale"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register('preferredLocale')}
            >
              {SUPPORTED_LOCALES.map((lng) => (
                <option key={lng} value={lng}>
                  {t(`languages.${lng}`)}
                </option>
              ))}
            </select>
          </FormField>

          <label
            className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-secondary/30 p-3 text-sm"
            htmlFor="reg-acceptedTerms"
          >
            <input
              id="reg-acceptedTerms"
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={!!form.formState.errors.acceptedTerms}
              {...form.register('acceptedTerms')}
            />
            <span className="text-foreground/80">{t('auth.fields.acceptedTerms')}</span>
          </label>
          {form.formState.errors.acceptedTerms ? (
            <p role="alert" className="text-xs text-destructive">
              {t(form.formState.errors.acceptedTerms.message ?? 'auth.errors.termsRequired')}
            </p>
          ) : null}

          {apiError ? <ErrorBanner messageKey={apiError.i18nKeyForTitle()} /> : null}

          <Button type="submit" size="lg" disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {isLoading ? t('auth.register.submitting') : t('auth.register.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

function SuccessNotice() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-md border border-success/40 bg-success/10 p-4 text-center"
    >
      <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
      <p className="text-sm font-medium text-foreground">{t('auth.register.successTitle')}</p>
      <p className="text-xs text-muted-foreground">{t('auth.register.successBody')}</p>
    </div>
  );
}

function ErrorBanner({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {t(messageKey)}
    </p>
  );
}
