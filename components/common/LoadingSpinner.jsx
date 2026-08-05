import { cn } from '@/lib/utils'

export function LoadingSpinner({ size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }
  return (
    <div
      className={cn(
        'rounded-full border-blue-600 border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
      style={{ borderWidth: size === 'sm' ? 2 : size === 'md' ? 3 : 4 }}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="stat-card space-y-3 animate-pulse">
      <div className="shimmer h-4 rounded-lg w-2/3" />
      <div className="shimmer h-8 rounded-lg w-1/2" />
      <div className="shimmer h-3 rounded-lg w-3/4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="shimmer h-4 rounded flex-1"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
