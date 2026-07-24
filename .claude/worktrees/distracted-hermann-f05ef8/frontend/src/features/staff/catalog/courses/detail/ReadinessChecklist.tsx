import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { PublishReadiness, PublishReadinessItem } from './lifecycle';

/**
 * Publish-readiness rendering, shared by the Publishing tab's standing checklist
 * and the post-failed-publish "blocked" alert. Driven by a readiness DTO rather
 * than the whole course so it can render the checklist from either the detail
 * payload or the 422 error extension.
 */

/** Unmet-requirement list. Each item prefers its `messageKey`, falling back to
 * the server `message` / `code` so an unknown requirement is never blank. */
export function ReadinessItemsList({ items }: { items: PublishReadinessItem[] }) {
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

export function ReadinessChecklist({
  readiness,
}: {
  readiness: PublishReadiness | null | undefined;
}) {
  const { t } = useTranslation();
  const unmet = readiness?.items ?? [];

  if (readiness?.isReady) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {t('staff.catalog.courses.detail.publishing.readyTitle')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('staff.catalog.courses.detail.publishing.readyBody')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t('staff.catalog.courses.detail.publishing.blockedTitle')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('staff.catalog.courses.detail.publishing.blockedBody')}
        </p>
      </div>
      <ReadinessItemsList items={unmet} />
    </div>
  );
}
