import { useTranslation } from 'react-i18next';
import { CircleDot, CircleSlash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Active / Inactive status pill. Active reads as a positive (success) state;
 * inactive is a calm outline so retired categories don't shout. The icon backs
 * the colour for users who can't distinguish it.
 */
export function CategoryStatusBadge({ isActive }: { isActive: boolean | undefined }) {
  const { t } = useTranslation();
  const Icon = isActive ? CircleDot : CircleSlash;
  return (
    <Badge variant={isActive ? 'success' : 'outline'}>
      <Icon aria-hidden="true" className="size-3.5" />
      {t(
        isActive
          ? 'staff.catalog.categories.status.active'
          : 'staff.catalog.categories.status.inactive',
      )}
    </Badge>
  );
}
