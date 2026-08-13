import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  gradient,
  iconBg,
  valuePrefix,
  valueSuffix,
  className,
}) {
  const isPositive = change > 0
  const isNeutral = change === 0 || change == null

  return (
    <div className={cn('stat-card group cursor-default', className)}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            iconBg || gradient || 'bg-blue-100 dark:bg-blue-900/30'
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                'w-5 h-5',
                gradient ? 'text-white' : 'text-blue-600 dark:text-blue-400'
              )}
            />
          )}
        </div>

        {!isNeutral && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <div className="text-xl font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight">
          {valuePrefix}
          {value}
          {valueSuffix}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {title}
        </div>
        {changeLabel && (
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {changeLabel}
          </div>
        )}
      </div>
    </div>
  )
}

export function GradientStatsCard({
  title,
  value,
  icon: Icon,
  gradient = 'bg-gradient-primary',
  valuePrefix,
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-200 relative overflow-hidden',
        gradient,
        className
      )}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/70 text-sm font-medium">{title}</span>
          {Icon && (
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {valuePrefix}
          {value}
        </div>
      </div>
    </div>
  )
}
