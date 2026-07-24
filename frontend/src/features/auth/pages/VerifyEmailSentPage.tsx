import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { resendVerificationSchema, type ResendVerificationFormValues } from '../schemas';

export function VerifyEmailSentPage() {
  const { t } = useTranslation();
  const [resentTo, setResentTo] = useState<string | null>(null);

  const form = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ResendVerificationFormValues) =>
      authApi.resendVerification({ email: values.email.trim().toLowerCase() }),
    onSuccess: (_, variables) => {
      setResentTo(variables.email.trim().toLowerCase());
      form.reset({ email: '' });
    },
  });

  return (
    <AuthCard
      kickerKey="auth.verifyEmailSent.kicker"
      titleKey="auth.verifyEmailSent.title"
      descriptionKey="auth.verifyEmailSent.description"
      footer={
        <Link
          to="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('auth.verifyEmailSent.backToLogin')}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-5 text-center">
        <Mail aria-hidden="true" className="size-10 text-primary" />
        <p className="text-sm text-foreground">{t('auth.verifyEmailSent.body')}</p>
      </div>

      <details className="mt-6 rounded-md border border-border bg-surface/50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">
          {t('auth.verifyEmailSent.didNotReceive')}
        </summary>
        <form
          className="mt-3 space-y-3"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          <FormField
            id="resend-email"
            labelKey="auth.fields.email"
            required
            errorKey={form.formState.errors.email?.message ?? undefined}
          >
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
          </FormField>
          {resentTo ? (
            <p
              role="status"
              className="rounded-md border border-success/40 bg-success/10 p-2 text-xs text-foreground"
            >
              {t('auth.verifyEmailSent.resentMessage')}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {mutation.isPending
              ? t('auth.verifyEmailSent.resending')
              : t('auth.verifyEmailSent.resend')}
          </Button>
        </form>
      </details>
    </AuthCard>
  );
}
