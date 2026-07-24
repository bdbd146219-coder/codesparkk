import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import type { LearningPathReadiness, LearningPathReadinessItem } from './detail-helpers';

/**
 * Publish-readiness rendering, shared by the Publishing tab's standing checklist
 * and the post-failed-publish "blocked" alert (C3F). Readiness is unmet-only for
 * paths (C3C), so the list renders only the requirements that are not yet met.
 * Kept in its own module so the checklist and the interactive lifecycle panel
 * can both use it without importing each other.
 */

const KEY = 'staff.catalog.learningPaths.detail.publishing';

/** Unmet-requirement list. Each item prefers its `messageKey`, falling back to
 * the server `message` / `code` so an unknown requirement is never blank. */
export function ReadinessItemsList({ items }: { items: LearningPathReadinessItem[] }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={item.code ?? i}
          className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-3"
        >
          <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-sm text-foreground">
            {item.messageKey
              ? t(item.messageKey, { defaultValue: item.message ?? item.code ?? '' })
              : (item.message ?? item.code)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The standing readiness card body: a ready state, the unmet checklist, or a
 * neutral "checks will appear" note when no readiness is present. */
export function ReadinessView({
  readiness,
}: {
  readiness: LearningPathReadiness | null | undefined;
}) {
  const { t } = useTranslation();

  if (!readiness) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t(`${KEY}.noReadiness`)}
      </p>
    );
  }

  if (readiness.isReady) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{t(`${KEY}.readyTitle`)}</p>
          <p className="text-sm text-muted-foreground">{t(`${KEY}.readyBody`)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{t(`${KEY}.blockedTitle`)}</p>
        <p className="text-sm text-muted-foreground">{t(`${KEY}.blockedBody`)}</p>
      </div>
      <ReadinessItemsList items={readiness.items ?? []} />
    </div>
  );
}
