import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas';
import { readDevState } from '../utils/page-state';

const STATES = ['empty', 'sent', 'invalid'] as const;
type State = (typeof STATES)[number];

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const devState: State | null = readDevState(searchParams, STATES);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) =>
      authApi.forgotPassword({ email: values.email.trim().toLowerCase() }),
  });

  useEffect(() => {
    if (devState === 'invalid') {
      form.setError('email', { message: 'auth.errors.emailInvalid' });
    }
  }, [devState, form]);

  const isSent = devState === 'sent' || mutation.isSuccess;

  return (
    <AuthCard
      kickerKey="auth.forgot.kicker"
      titleKey="auth.forgot.title"
      descriptionKey="auth.forgot.description"
      footer={
        <Link
          to="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('auth.forgot.backToLogin')}
        </Link>
      }
    >
      {isSent ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-md border border-success/40 bg-success/10 p-6 text-center"
        >
          <CheckCircle2 aria-hidden="true" className="size-10 text-success" />
          <p className="text-sm font-medium text-foreground">{t('auth.forgot.sentTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('auth.forgot.sentBody')}</p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <FormField
            id="forgot-email"
            labelKey="auth.fields.email"
            required
            errorKey={form.formState.errors.email?.message ?? undefined}
            hintKey="auth.forgot.hint"
          >
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
          </FormField>

          <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {mutation.isPending ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
