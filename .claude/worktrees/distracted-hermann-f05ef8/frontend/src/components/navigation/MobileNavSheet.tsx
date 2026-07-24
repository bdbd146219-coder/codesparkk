import * as React from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BrandLockup } from './BrandLockup';
import { NavLinkButton } from './NavLinkButton';
import type { NavConfig } from '@/lib/navigation';

export interface MobileNavSheetProps {
  config: NavConfig;
  /** Description for assistive technology only — provides context for the sheet. */
  ariaDescriptionKey?: string;
  /** Optional slot for additional content (theme/language switchers) under the nav. */
  footerSlot?: React.ReactNode;
}

export function MobileNavSheet({ config, ariaDescriptionKey, footerSlot }: MobileNavSheetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nav.mobileMenuLabel')}
          className="md:hidden"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" className="w-80 max-w-[80vw]">
        <SheetHeader>
          <SheetTitle>
            <BrandLockup />
          </SheetTitle>
          {ariaDescriptionKey ? <SheetDescription>{t(ariaDescriptionKey)}</SheetDescription> : null}
        </SheetHeader>
        <nav aria-label={t('nav.mobileMenuLabel')} className="flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {config.primary.map((group, gIndex) => (
              <li key={gIndex} className="space-y-1">
                {group.i18nKey ? (
                  <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(group.i18nKey)}
                  </div>
                ) : null}
                <ul className="space-y-1">
                  {group.items.map((item, iIndex) => (
                    <li key={iIndex}>
                      <SheetClose asChild>
                        <NavLinkButton item={item} variant="mobile" onSelect={close} />
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {config.utility && config.utility.length > 0 ? (
            <>
              <div className="my-3 h-px bg-border" aria-hidden="true" />
              <ul className="space-y-1">
                {config.utility.map((item, index) => (
                  <li key={index}>
                    <SheetClose asChild>
                      <NavLinkButton item={item} variant="mobile" onSelect={close} />
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
        {footerSlot ? (
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {footerSlot}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
