import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListedBadge, PublishStateBadge } from '../../courses/badges';
import { LifecycleActions } from './LifecycleActions';
import { ReadinessView } from './ReadinessChecklist';
import type { LifecycleDemo } from './lifecycle';
import type { AdminLearningPathDetail } from './detail-helpers';

const KEY = 'staff.catalog.learningPaths.detail';

interface PublishingPanelProps {
  path: AdminLearningPathDetail;
  onReloadLatest: () => void;
  /** Dev-only lifecycle display overrides for visual QA. */
  demo?: LifecycleDemo;
}

/** Read-only label + value pair, shared by the editor's metadata and the Publishing tab. */
export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

// --- Publishing tab ---------------------------------------------------------

export function PublishingPanel({ path, onReloadLatest, demo }: PublishingPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.publishing.stateHeading`)}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <MetaItem label={t(`${KEY}.publishing.status`)}>
              <PublishStateBadge value={path.publishState} />
            </MetaItem>
            <MetaItem label={t(`${KEY}.publishing.visibility`)}>
              <ListedBadge isListed={path.isListed} />
            </MetaItem>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.publishing.readinessHeading`)}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadinessView readiness={path.readiness} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.publishing.actionsHeading`)}</CardTitle>
        </CardHeader>
        <CardContent>
          <LifecycleActions path={path} onReloadLatest={onReloadLatest} demo={demo} />
        </CardContent>
      </Card>
    </div>
  );
}
