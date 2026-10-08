import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('dialog-overlay fixed inset-0 z-50 bg-black/45', className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'dialog-content fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-lg',
        'max-h-[calc(100dvh-1.5rem)] -translate-x-1/2 -translate-y-1/2',
        'flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-0 shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full',
          'text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background',
          'disabled:pointer-events-none',
        )}
      >
        <X className="h-5 w-5" strokeWidth={2} />
        <span className="sr-only">{t('common.close')}</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex shrink-0 flex-row items-center justify-start gap-3 border-b border-border px-4 pb-3.5 pt-4 pr-12 text-left',
      className,
    )}
    {...props}
  />
)

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain p-4', className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex shrink-0 flex-col-reverse gap-2 p-4 pt-2 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
)

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-[17px] font-semibold leading-none tracking-tight text-left', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
