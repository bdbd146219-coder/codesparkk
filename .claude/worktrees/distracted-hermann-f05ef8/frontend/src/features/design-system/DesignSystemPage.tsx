import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Bookmark, Check, Settings2 } from 'lucide-react';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLOR_TOKENS = [
  'background',
  'foreground',
  'surface',
  'primary',
  'secondary',
  'accent',
  'muted',
  'border',
  'success',
  'warning',
  'error',
] as const;

const TYPE_SCALE = [
  { label: 'text-xs', cls: 'text-xs' },
  { label: 'text-sm', cls: 'text-sm' },
  { label: 'text-base', cls: 'text-base' },
  { label: 'text-lg', cls: 'text-lg' },
  { label: 'text-xl', cls: 'text-xl' },
  { label: 'text-2xl', cls: 'text-2xl' },
  { label: 'text-3xl', cls: 'text-3xl' },
  { label: 'text-4xl', cls: 'text-4xl' },
] as const;

const RADIUS_SCALE = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'] as const;
const SHADOW_SCALE = ['shadow-sm', 'shadow-md', 'shadow-lg'] as const;
const MOTION_SCALE = [
  { label: 'duration-fast', cls: 'duration-fast' },
  { label: 'duration-normal', cls: 'duration-normal' },
  { label: 'duration-slow', cls: 'duration-slow' },
] as const;

export function DesignSystemPage() {
  const { t } = useTranslation();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {t('designSystem.kicker')}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('designSystem.title')}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              {t('designSystem.lead')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Colors -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.colors')}
          subtitle={t('designSystem.sectionLead.colors')}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOR_TOKENS.map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
              >
                <div
                  className="size-10 shrink-0 rounded-md border border-border/60"
                  style={{ backgroundColor: `hsl(var(--${name}))` }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">var(--{name})</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography ---------------------------------------------- */}
        <Section
          title={t('designSystem.sections.typography')}
          subtitle={t('designSystem.sectionLead.typography')}
        >
          <div className="space-y-2 rounded-md border border-border bg-surface p-5">
            {TYPE_SCALE.map((s) => (
              <div key={s.label} className="flex items-baseline gap-4">
                <span className="w-24 text-xs text-muted-foreground">{s.label}</span>
                <span className={s.cls}>{t('designSystem.typeSample')}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Radius -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.radius')}
          subtitle={t('designSystem.sectionLead.radius')}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {RADIUS_SCALE.map((r) => (
              <div key={r} className="flex flex-col items-center gap-2">
                <div className={`${r} h-16 w-full border border-primary/30 bg-primary/15`} />
                <span className="text-xs text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Shadows ------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.shadows')}
          subtitle={t('designSystem.sectionLead.shadows')}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SHADOW_SCALE.map((s) => (
              <div
                key={s}
                className={`${s} flex h-20 items-center justify-center rounded-md border border-border bg-surface`}
              >
                <span className="text-xs text-muted-foreground">{s}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Motion -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.motion')}
          subtitle={t('designSystem.sectionLead.motion')}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MOTION_SCALE.map((m) => (
              <div
                key={m.label}
                onMouseEnter={() => setHover(m.label)}
                onMouseLeave={() => setHover(null)}
                className="rounded-md border border-border bg-surface p-4"
              >
                <div className="mb-3 text-xs font-medium text-muted-foreground">{m.label}</div>
                <div
                  className={`h-2 rounded-full bg-primary transition-all ease-out-soft ${m.cls}`}
                  style={{ width: hover === m.label ? '100%' : '20%' }}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('designSystem.motionHint')}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons ------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.buttons')}
          subtitle={t('designSystem.sectionLead.buttons')}
        >
          <div className="space-y-4 rounded-md border border-border bg-surface p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label={t('designSystem.iconButtonLabel')}>
                <Bell aria-hidden="true" />
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>
                <Check aria-hidden="true" />
                {t('designSystem.withIconLeading')}
              </Button>
              <Button variant="outline">
                {t('designSystem.withIconTrailing')}
                <Bookmark aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Section>

        {/* Inputs -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.inputs')}
          subtitle={t('designSystem.sectionLead.inputs')}
        >
          <div className="grid gap-4 rounded-md border border-border bg-surface p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ds-email">{t('designSystem.inputs.emailLabel')}</Label>
              <Input id="ds-email" type="email" placeholder="parent@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-pin">{t('designSystem.inputs.pinLabel')}</Label>
              <Input id="ds-pin" type="text" inputMode="numeric" placeholder="1234" maxLength={6} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ds-disabled">{t('designSystem.inputs.disabledLabel')}</Label>
              <Input
                id="ds-disabled"
                disabled
                placeholder={t('designSystem.inputs.disabledPlaceholder')}
              />
            </div>
          </div>
        </Section>

        {/* Cards --------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.cards')}
          subtitle={t('designSystem.sectionLead.cards')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('designSystem.cards.exampleTitle')}</CardTitle>
                <CardDescription>{t('designSystem.cards.exampleDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.cards.exampleBody')}
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">{t('designSystem.cards.primaryAction')}</Button>
                <Button size="sm" variant="ghost">
                  {t('designSystem.cards.secondaryAction')}
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('designSystem.cards.statTitle')}</CardTitle>
                <CardDescription>{t('designSystem.cards.statDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">128</div>
                <div className="mt-1 text-xs text-success">
                  +12 {t('designSystem.cards.thisWeek')}
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Badges -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.badges')}
          subtitle={t('designSystem.sectionLead.badges')}
        >
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-5">
            <Badge>{t('designSystem.badges.default')}</Badge>
            <Badge variant="secondary">{t('designSystem.badges.secondary')}</Badge>
            <Badge variant="accent">{t('designSystem.badges.accent')}</Badge>
            <Badge variant="success">{t('designSystem.badges.success')}</Badge>
            <Badge variant="warning">{t('designSystem.badges.warning')}</Badge>
            <Badge variant="destructive">{t('designSystem.badges.destructive')}</Badge>
            <Badge variant="outline">{t('designSystem.badges.outline')}</Badge>
          </div>
        </Section>

        {/* Dialog -------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.dialog')}
          subtitle={t('designSystem.sectionLead.dialog')}
        >
          <div className="rounded-md border border-border bg-surface p-5">
            <Dialog>
              <DialogTrigger asChild>
                <Button>{t('designSystem.dialog.open')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('designSystem.dialog.title')}</DialogTitle>
                  <DialogDescription>{t('designSystem.dialog.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="ds-dialog-input">{t('designSystem.dialog.confirmLabel')}</Label>
                  <Input id="ds-dialog-input" placeholder="OK" />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">{t('designSystem.dialog.cancel')}</Button>
                  </DialogClose>
                  <Button>{t('designSystem.dialog.confirm')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Section>

        {/* Sheet --------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.sheet')}
          subtitle={t('designSystem.sectionLead.sheet')}
        >
          <div className="flex flex-wrap gap-3 rounded-md border border-border bg-surface p-5">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">{t('designSystem.sheet.openStart')}</Button>
              </SheetTrigger>
              <SheetContent side="start">
                <SheetHeader>
                  <SheetTitle>{t('designSystem.sheet.title')}</SheetTitle>
                  <SheetDescription>{t('designSystem.sheet.descriptionStart')}</SheetDescription>
                </SheetHeader>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="ghost">{t('designSystem.sheet.close')}</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">{t('designSystem.sheet.openEnd')}</Button>
              </SheetTrigger>
              <SheetContent side="end">
                <SheetHeader>
                  <SheetTitle>{t('designSystem.sheet.title')}</SheetTitle>
                  <SheetDescription>{t('designSystem.sheet.descriptionEnd')}</SheetDescription>
                </SheetHeader>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="ghost">{t('designSystem.sheet.close')}</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </Section>

        {/* Dropdown ------------------------------------------------ */}
        <Section
          title={t('designSystem.sections.dropdown')}
          subtitle={t('designSystem.sectionLead.dropdown')}
        >
          <div className="rounded-md border border-border bg-surface p-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings2 aria-hidden="true" />
                  {t('designSystem.dropdown.trigger')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{t('designSystem.dropdown.label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{t('designSystem.dropdown.profile')}</DropdownMenuItem>
                <DropdownMenuItem>{t('designSystem.dropdown.settings')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{t('designSystem.dropdown.signOut')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        {/* Tabs ---------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.tabs')}
          subtitle={t('designSystem.sectionLead.tabs')}
        >
          <div className="rounded-md border border-border bg-surface p-5">
            <Tabs defaultValue="learning">
              <TabsList>
                <TabsTrigger value="learning">{t('designSystem.tabs.learning')}</TabsTrigger>
                <TabsTrigger value="progress">{t('designSystem.tabs.progress')}</TabsTrigger>
                <TabsTrigger value="rewards">{t('designSystem.tabs.rewards')}</TabsTrigger>
              </TabsList>
              <TabsContent value="learning" className="text-sm text-muted-foreground">
                {t('designSystem.tabs.learningBody')}
              </TabsContent>
              <TabsContent value="progress" className="text-sm text-muted-foreground">
                {t('designSystem.tabs.progressBody')}
              </TabsContent>
              <TabsContent value="rewards" className="text-sm text-muted-foreground">
                {t('designSystem.tabs.rewardsBody')}
              </TabsContent>
            </Tabs>
          </div>
        </Section>

        {/* Tooltip ------------------------------------------------- */}
        <Section
          title={t('designSystem.sections.tooltip')}
          subtitle={t('designSystem.sectionLead.tooltip')}
        >
          <div className="flex flex-wrap gap-3 rounded-md border border-border bg-surface p-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">{t('designSystem.tooltip.hover')}</Button>
              </TooltipTrigger>
              <TooltipContent>{t('designSystem.tooltip.content')}</TooltipContent>
            </Tooltip>
          </div>
        </Section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          {t('designSystem.footer')}
        </footer>
      </main>
    </TooltipProvider>
  );
}

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
