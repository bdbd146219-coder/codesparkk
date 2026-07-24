import { useTranslation } from 'react-i18next';
import { Container } from '@/components/layout';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { studentNav } from '@/lib/navigation';
import { BrandLockup } from './BrandLockup';
import { NavLinkButton } from './NavLinkButton';
import { MobileNavSheet } from './MobileNavSheet';

export function StudentTopBar() {
  const { t } = useTranslation();
  const items = studentNav.primary[0]?.items ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container size="xl" padded>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MobileNavSheet
              config={studentNav}
              ariaDescriptionKey="nav.student.mobileDescription"
              footerSlot={
                <>
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                </>
              }
            />
            <BrandLockup />
          </div>

          <nav
            aria-label={t('nav.student.primaryLabel')}
            className="hidden items-center gap-1 md:flex"
          >
            {items.map((item, index) => (
              <NavLinkButton key={index} item={item} variant="topbar" />
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </Container>
    </header>
  );
}
