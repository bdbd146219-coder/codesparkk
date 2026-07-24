import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

/**
 * Sheet sides are `start | end | top | bottom` — `start`/`end` resolve along the
 * inline axis so they automatically mirror in RTL. Do not use `left`/`right`.
 */
const sheetVariants = cva(
  [
    'fixed z-50 bg-surface text-surface-foreground shadow-lg',
    'transition ease-out-soft duration-normal',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
  ].join(' '),
  {
    variants: {
      side: {
        top: [
          'inset-x-0 top-0 border-b border-border',
          'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        ].join(' '),
        bottom: [
          'inset-x-0 bottom-0 border-t border-border',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        ].join(' '),
        start: [
          'inset-y-0 start-0 h-full w-3/4 max-w-sm border-e border-border',
          'rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
          'ltr:data-[state=closed]:slide-out-to-left ltr:data-[state=open]:slide-in-from-left',
        ].join(' '),
        end: [
          'inset-y-0 end-0 h-full w-3/4 max-w-sm border-s border-border',
          'rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left',
          'ltr:data-[state=closed]:slide-out-to-right ltr:data-[state=open]:slide-in-from-right',
        ].join(' '),
      },
    },
    defaultVariants: { side: 'end' },
  },
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'end', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      <div className="flex h-full flex-col gap-6 p-6">{children}</div>
      <DialogPrimitive.Close
        className={cn(
          'absolute end-4 top-4 rounded-sm opacity-70 transition-opacity duration-fast',
          'hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 text-start', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-auto flex flex-col gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';
