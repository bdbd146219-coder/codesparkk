import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';

export interface NavLinkButtonProps {
  item: NavItem;
  variant?: 'topbar' | 'sidebar' | 'mobile';
  onSelect?: () => void;
  className?: string;
}

/**
 * Renders a single nav item with three visual variants. Handles three states:
 *   - active   (current route, only for items with `to`)
 *   - inactive (link)
 *   - disabled (no link, "soon" badge, aria-disabled, not focusable as link)
 */
export function NavLinkButton({
  item,
  variant = 'topbar',
  onSelect,
  className,
}: NavLinkButtonProps) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(item.i18nKey);
  const badge = item.badgeI18nKey ? t(item.badgeI18nKey) : null;

  const baseClasses = cn(
    'group inline-flex items-center gap-2 rounded-md font-medium transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    variant === 'topbar' && 'whitespace-nowrap px-2.5 py-1.5 text-sm',
    variant === 'sidebar' && 'w-full px-3 py-2 text-sm',
    variant === 'mobile' && 'w-full px-3 py-3 text-base',
  );

  if (item.disabled || !item.to) {
    // Suppress the "soon" badge inside the desktop topbar — there it makes
    // the nav look like a TODO list. Sidebar/mobile keep it because they
    // have the horizontal room and the badge is the only state cue.
    const showBadge = badge && variant !== 'topbar';
    return (
      <span
        aria-disabled="true"
        className={cn(
          baseClasses,
          'cursor-not-allowed text-muted-foreground/70',
          variant !== 'topbar' && 'justify-between',
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          {Icon ? <Icon aria-hidden="true" className="size-4 opacity-70" /> : null}
          <span>{label}</span>
        </span>
        {showBadge ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </span>
    );
  }

  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onSelect}
        className={cn(
          baseClasses,
          'text-foreground/70 hover:bg-secondary hover:text-foreground',
          className,
        )}
      >
        {Icon ? <Icon aria-hidden="true" className="size-4 opacity-70" /> : null}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onSelect}
      className={({ isActive }) =>
        cn(
          baseClasses,
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
          variant !== 'topbar' && 'justify-between',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="inline-flex items-center gap-2">
            {Icon ? (
              <Icon
                aria-hidden="true"
                className={cn('size-4 opacity-80', isActive && 'opacity-100')}
              />
            ) : null}
            <span>{label}</span>
          </span>
          {badge && variant !== 'topbar' ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}
