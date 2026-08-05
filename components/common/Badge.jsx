import { cn, STATUS_COLORS } from '@/lib/utils'

export function Badge({ children, variant, className }) {
  const baseClass = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium'

  if (variant === 'dot') {
    return (
      <span className={cn(baseClass, className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {children}
      </span>
    )
  }

  const colorClass = STATUS_COLORS[children] || STATUS_COLORS[variant] || 'badge-inactive'

  return (
    <span className={cn(baseClass, colorClass, className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  return <Badge>{status}</Badge>
}
