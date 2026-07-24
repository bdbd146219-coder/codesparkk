import { Bell, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { staffNav } from '@/lib/navigation';
import { BrandLockup } from './BrandLockup';
import { MobileNavSheet } from './MobileNavSheet';

export function StaffTopBar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <MobileNavSheet
            config={staffNav}
            ariaDescriptionKey="nav.staff.mobileDescription"
            footerSlot={
              <>
                <ThemeSwitcher />
                <LanguageSwitcher />
              </>
            }
          />
          <span className="md:hidden">
            <BrandLockup />
          </span>
        </div>

        <div className="relative hidden max-w-md flex-1 md:block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            disabled
            placeholder={t('nav.staff.searchPlaceholder')}
            className="ps-9"
            aria-label={t('nav.staff.searchLabel')}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeSwitcher className="hidden sm:inline-flex" />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Button
            variant="ghost"
            size="icon"
            disabled
            aria-label={t('nav.staff.notificationsLabel')}
          >
            <Bell aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
