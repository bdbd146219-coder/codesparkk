import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/use-auth';
import { safeReturnUrl } from '@/lib/auth/return-url';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { loginSchema, type LoginFormValues } from '../schemas';
import { readDevState } from '../utils/page-state';

const STATES = [
  'empty',
  'invalid',
  'invalid-credentials',
  'email-not-verified',
  'locked',
  'loading',
] as const;
type State = (typeof STATES)[number];

export function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devState: State | null = readDevState(searchParams, STATES);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      auth.login(values.email.trim().toLowerCase(), values.password),
    onSuccess: () => {
      const target = safeReturnUrl(searchParams.get('return'));
      navigate(target, { replace: true });
    },
  });

  useEffect(() => {
    if (devState === 'invalid') {
      form.setError('email', { message: 'auth.errors.emailInvalid' });
      form.setError('password', { message: 'auth.errors.passwordRequired' });
    }
  }, [devState, form]);

  const isLoading = mutation.isPending || devState === 'loading';

  // Map dev states to fake ApiErrors so the screenshot pipeline can capture
  // each failure mode without driving a real backend.
  const fakeError =
    devState === 'invalid-credentials'
      ? new ApiError(
          401,
          'https://csk/errors/auth/invalid-credentials',
          'auth.errors.invalidCredentials',
        )
      : devState === 'email-not-verified'
        ? new ApiError(
            403,
            'https://csk/errors/auth/email-not-verified',
            'auth.errors.emailNotVerified',
          )
        : devState === 'locked'
          ? new ApiError(423, 'https://csk/errors/auth/account-locked', 'auth.errors.accountLocked')
          : null;
  const apiError = fakeError ?? (mutation.error instanceof ApiError ? mutation.error : null);

  return (
    <AuthCard
      kickerKey="auth.login.kicker"
      titleKey="auth.login.title"
      descriptionKey="auth.login.description"
      footer={
        <span>
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.login.createAccount')}
          </Link>
        </span>
      }
    >
      {searchParams.get('verified') === '1' ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground"
        >
          {t('auth.login.verifiedToast')}
        </p>
      ) : null}
      {searchParams.get('reset') === '1' ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-foreground"
        >
          {t('auth.login.resetToast')}
        </p>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <FormField
          id="login-email"
          labelKey="auth.fields.email"
          required
          errorKey={form.formState.errors.email?.message ?? undefined}
        >
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </FormField>

        <FormField
          id="login-password"
          labelKey="auth.fields.password"
          required
          errorKey={form.formState.errors.password?.message ?? undefined}
        >
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </FormField>

        <div className="flex items-center justify-end">
          <Link
            to="/auth/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        </div>

        {apiError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {t(apiError.i18nKeyForTitle())}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
