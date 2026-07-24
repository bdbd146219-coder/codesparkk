import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas';
import { stripSensitiveQuery } from '../utils/strip-token';
import { readDevState } from '../utils/page-state';

const STATES = ['empty', 'invalid', 'success', 'invalid-token'] as const;
type State = (typeof STATES)[number];

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devState: State | null = readDevState(searchParams, STATES);

  // Capture once before the strip, so subsequent reads still have the token.
  const captured = useMemo(
    () => ({
      userId: searchParams.get('userId') ?? '',
      token: searchParams.get('token') ?? '',
    }),
    [searchParams],
  );

  useEffect(() => {
    stripSensitiveQuery(['userId', 'token']);
  }, []);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const redirectTimer = useRef<number | null>(null);
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      authApi.resetPassword({
        userId: captured.userId,
        token: captured.token,
        newPassword: values.password,
      }),
    onSuccess: () => {
      // Brief pause so the success banner is actually seen before nav.
      redirectTimer.current = window.setTimeout(() => {
        navigate('/auth/login?reset=1', { replace: true });
      }, 1200);
    },
  });

  useEffect(() => {
    return () => {
      if (redirectTimer.current !== null) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (devState === 'invalid') {
      form.setError('password', { message: 'auth.errors.passwordTooShort' });
      form.setError('confirmPassword', { message: 'auth.errors.passwordMismatch' });
    }
  }, [devState, form]);

  const tokenLooksInvalid =
    devState === 'invalid-token' || (!devState && (!captured.userId || !captured.token));

  const isSuccess = devState === 'success' || mutation.isSuccess;

  if (tokenLooksInvalid) {
    return (
      <AuthCard
        kickerKey="auth.reset.kicker"
        titleKey="auth.reset.invalidTitle"
        descriptionKey="auth.reset.invalidBody"
        footer={
          <Link
            to="/auth/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.reset.requestNew')}
          </Link>
        }
      >
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center"
        >
          <AlertTriangle aria-hidden="true" className="size-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">{t('auth.reset.invalidBody')}</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      kickerKey="auth.reset.kicker"
      titleKey="auth.reset.title"
      descriptionKey="auth.reset.description"
      footer={
        <Link
          to="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('auth.reset.backToLogin')}
        </Link>
      }
    >
      {isSuccess ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-md border border-success/40 bg-success/10 p-6 text-center"
        >
          <CheckCircle2 aria-hidden="true" className="size-10 text-success" />
          <p className="text-sm font-medium text-foreground">{t('auth.reset.successTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('auth.reset.successBody')}</p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <FormField
            id="reset-password"
            labelKey="auth.fields.password"
            required
            errorKey={form.formState.errors.password?.message ?? undefined}
            hintKey="auth.hints.password"
          >
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
          </FormField>

          <FormField
            id="reset-confirmPassword"
            labelKey="auth.fields.confirmPassword"
            required
            errorKey={form.formState.errors.confirmPassword?.message ?? undefined}
          >
            <Input
              id="reset-confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register('confirmPassword')}
            />
          </FormField>

          {mutation.error instanceof ApiError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {t(mutation.error.i18nKeyForTitle())}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {mutation.isPending ? t('auth.reset.submitting') : t('auth.reset.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
