import { useTranslation } from 'react-i18next';
import { staffNav } from '@/lib/navigation';
import { BrandLockup } from './BrandLockup';
import { NavLinkButton } from './NavLinkButton';

/**
 * Desktop-only sidebar for the staff shell. On mobile the same `staffNav`
 * is rendered through `MobileNavSheet` (see `StaffTopBar`).
 */
export function StaffSidebar() {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t('nav.staff.primaryLabel')}
      className="hidden h-screen w-64 shrink-0 border-e border-border bg-surface/60 md:sticky md:top-0 md:flex md:flex-col"
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <BrandLockup />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-4">
          {staffNav.primary.map((group, gIndex) => (
            <li key={gIndex} className="space-y-1">
              {group.i18nKey ? (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.i18nKey)}
                </div>
              ) : null}
              <ul className="space-y-1">
                {group.items.map((item, iIndex) => (
                  <li key={iIndex}>
                    <NavLinkButton item={item} variant="sidebar" />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      {staffNav.utility && staffNav.utility.length > 0 ? (
        <div className="border-t border-border p-3">
          <ul className="space-y-1">
            {staffNav.utility.map((item, index) => (
              <li key={index}>
                <NavLinkButton item={item} variant="sidebar" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
