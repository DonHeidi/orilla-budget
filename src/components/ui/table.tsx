import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Mail } from 'lucide-react'

import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  )
}

function TitleCell({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div
      data-slot="table-title-cell"
      className={cn('flex items-center gap-1.5', className)}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <span className="font-medium">{children}</span>
    </div>
  )
}

function SecondaryCell({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div
      data-slot="table-secondary-cell"
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  )
}

function NumericCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="table-numeric-cell"
      className={cn(
        'text-right font-mono text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  )
}

function EmailCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="table-email-cell"
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground',
        className
      )}
    >
      <Mail className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function DateTimeCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="table-datetime-cell"
      className={cn('text-muted-foreground tabular-nums', className)}
    >
      {children}
    </div>
  )
}

const statusVariants = {
  success: 'bg-success-dim text-success border-success-border',
  warning: 'bg-warning-dim text-warning border-warning-border',
  destructive: 'bg-destructive-dim text-destructive border-destructive-border',
  info: 'bg-info-dim text-info border-info-border',
  muted: 'bg-muted text-muted-foreground border-border',
} as const

type StatusVariant = keyof typeof statusVariants

function StatusCell({
  children,
  variant,
  className,
}: {
  children: React.ReactNode
  variant: StatusVariant
  className?: string
}) {
  return (
    <span
      data-slot="table-status-cell"
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium',
        statusVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

Table.TitleCell = TitleCell
Table.SecondaryCell = SecondaryCell
Table.NumericCell = NumericCell
Table.EmailCell = EmailCell
Table.DateTimeCell = DateTimeCell
Table.StatusCell = StatusCell

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

export type { StatusVariant }
