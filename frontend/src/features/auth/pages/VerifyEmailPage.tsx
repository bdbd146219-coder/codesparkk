import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { AuthCard } from '../components/AuthCard';
import { stripSensitiveQuery } from '../utils/strip-token';
import { readDevState } from '../utils/page-state';

const STATES = ['loading', 'success', 'invalid'] as const;
type State = (typeof STATES)[number];

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const devState: State | null = readDevState(searchParams, STATES);

  const captured = useMemo(
    () => ({
      userId: searchParams.get('userId') ?? '',
      token: searchParams.get('token') ?? '',
    }),
    [searchParams],
  );

  const triggered = useRef(false);

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail({ userId: captured.userId, token: captured.token }),
  });

  useEffect(() => {
    stripSensitiveQuery(['userId', 'token']);
    if (devState) return; // dev override — never call the API
    if (!captured.userId || !captured.token) return;
    if (triggered.current) return;
    triggered.current = true;
    mutation.mutate();
    // mutate is stable; intentional one-shot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured, devState]);

  const isLoading =
    devState === 'loading' || (mutation.isPending && !mutation.isSuccess && !mutation.isError);
  const isSuccess = devState === 'success' || mutation.isSuccess;
  const isInvalid =
    devState === 'invalid' ||
    (!isLoading &&
      !isSuccess &&
      !devState &&
      (!captured.userId || !captured.token || mutation.error instanceof ApiError));

  return (
    <AuthCard
      kickerKey="auth.verifyEmail.kicker"
      titleKey={
        isSuccess
          ? 'auth.verifyEmail.successTitle'
          : isInvalid
            ? 'auth.verifyEmail.invalidTitle'
            : 'auth.verifyEmail.title'
      }
      descriptionKey={
        isSuccess
          ? 'auth.verifyEmail.successDescription'
          : isInvalid
            ? 'auth.verifyEmail.invalidDescription'
            : 'auth.verifyEmail.description'
      }
      footer={
        isInvalid ? (
          <Link
            to="/auth/verify-email-sent"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.verifyEmail.requestNew')}
          </Link>
        ) : (
          <Link
            to="/auth/login?verified=1"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('auth.verifyEmail.continueToLogin')}
          </Link>
        )
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface/50 p-6 text-center">
          <Loader2 aria-hidden="true" className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('auth.verifyEmail.loading')}</p>
        </div>
      ) : isSuccess ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-md border border-success/40 bg-success/10 p-6 text-center"
        >
          <CheckCircle2 aria-hidden="true" className="size-10 text-success" />
          <p className="text-sm font-medium text-foreground">{t('auth.verifyEmail.successBody')}</p>
        </div>
      ) : (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center"
        >
          <AlertTriangle aria-hidden="true" className="size-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">{t('auth.verifyEmail.invalidBody')}</p>
        </div>
      )}
    </AuthCard>
  );
}
