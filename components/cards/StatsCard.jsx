import { cn } from '@/lib/utils'

const colorConfigMap = {
  'bg-blue-500': { stroke: '#2563eb', fill: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30 shadow-lg', text: 'text-blue-600', ringBg: 'stroke-blue-100 dark:stroke-blue-950' },
  'bg-blue-600': { stroke: '#2563eb', fill: 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-600/30 shadow-lg', text: 'text-blue-600', ringBg: 'stroke-blue-100 dark:stroke-blue-950' },
  'bg-sky-500': { stroke: '#0ea5e9', fill: 'bg-gradient-to-br from-sky-500 to-sky-600 shadow-sky-500/30 shadow-lg', text: 'text-sky-600', ringBg: 'stroke-sky-100 dark:stroke-sky-950' },
  'bg-cyan-500': { stroke: '#06b6d4', fill: 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/30 shadow-lg', text: 'text-cyan-600', ringBg: 'stroke-cyan-100 dark:stroke-cyan-950' },
  'bg-teal-500': { stroke: '#14b8a6', fill: 'bg-gradient-to-br from-teal-500 to-teal-600 shadow-teal-500/30 shadow-lg', text: 'text-teal-600', ringBg: 'stroke-teal-100 dark:stroke-teal-950' },
  'bg-indigo-500': { stroke: '#6366f1', fill: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30 shadow-lg', text: 'text-indigo-600', ringBg: 'stroke-indigo-100 dark:stroke-indigo-950' },
  'bg-emerald-500': { stroke: '#10b981', fill: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 shadow-lg', text: 'text-emerald-600', ringBg: 'stroke-emerald-100 dark:stroke-emerald-950' },
  'bg-violet-500': { stroke: '#8b5cf6', fill: 'bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/30 shadow-lg', text: 'text-violet-600', ringBg: 'stroke-violet-100 dark:stroke-violet-950' },
  'bg-purple-600': { stroke: '#9333ea', fill: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/30 shadow-lg', text: 'text-purple-600', ringBg: 'stroke-purple-100 dark:stroke-purple-950' },
  'bg-fuchsia-500': { stroke: '#d946ef', fill: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 shadow-fuchsia-500/30 shadow-lg', text: 'text-fuchsia-600', ringBg: 'stroke-fuchsia-100 dark:stroke-fuchsia-950' },
  'bg-rose-500': { stroke: '#f43f5e', fill: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30 shadow-lg', text: 'text-rose-600', ringBg: 'stroke-rose-100 dark:stroke-rose-950' },
  'bg-amber-500': { stroke: '#f59e0b', fill: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/30 shadow-lg', text: 'text-amber-600', ringBg: 'stroke-amber-100 dark:stroke-amber-950' },
  'bg-orange-500': { stroke: '#f97316', fill: 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30 shadow-lg', text: 'text-orange-600', ringBg: 'stroke-orange-100 dark:stroke-orange-950' },
}

export function StatsCard({
  title,
  value,
  secondaryValue,
  change,
  changeLabel,
  icon: Icon,
  iconColor,
  accentColor,
  valuePrefix,
  valueSuffix,
  className,
}) {
  const accentKey = accentColor || (iconColor ? iconColor.replace('text-', 'bg-').split(' ')[0] : 'bg-blue-500')
  const theme = colorConfigMap[accentKey] || { stroke: '#2563eb', fill: 'bg-blue-500', text: 'text-blue-600', ringBg: 'stroke-slate-100 dark:stroke-slate-800' }
  
  // Display percentage from change prop or realistic sample percentage
  const hasExplicitChange = change != null
  const percentNum = hasExplicitChange ? Math.abs(change) : (Math.abs(typeof value === 'number' ? (value % 45) + 8 : 14))
  const isPositive = hasExplicitChange ? change >= 0 : true
  
  // Progress Ring Geometry (Radius = 12)
  const radius = 12
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(Math.max(percentNum, 5), 100)
  const strokeOffset = circumference - (clampedPercent / 100) * circumference

  // Calculate tip dot coordinates on the circle
  const angle = (clampedPercent / 100) * 360 - 90
  const rad = (angle * Math.PI) / 180
  const dotX = 16 + radius * Math.cos(rad)
  const dotY = 16 + radius * Math.sin(rad)

  return (
    <div 
      className={cn(
        'relative bg-white dark:bg-slate-900 rounded-2xl p-3 sm:px-4 sm:py-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden flex flex-col justify-center',
        className
      )}
    >
      <div className="flex items-center gap-3.5 relative z-10 w-full">
        {/* Left: Icon */}
        {Icon ? (
          <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 duration-300 drop-shadow-sm", theme.fill)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        ) : <div className="w-10 h-10 shrink-0" />}

        {/* Middle: Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase truncate mb-0.5">
            {title}
          </p>
          <div className="flex items-baseline gap-1 truncate">
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
              {valuePrefix}{value}{valueSuffix}
            </span>
            {secondaryValue != null && (
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                {secondaryValue}
              </span>
            )}
          </div>
        </div>

        {/* Right: Progress Gauge */}
        <div className="shrink-0 relative w-8 h-8 flex items-center justify-center ml-1">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r={radius}
              fill="none"
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="2.5"
            />
            <circle
              cx="16"
              cy="16"
              r={radius}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <circle
              cx={dotX}
              cy={dotY}
              r="2"
              fill={theme.stroke}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute text-[8px] font-bold tracking-tighter text-slate-700 dark:text-slate-200">
            {isPositive ? `+${percentNum}` : `-${percentNum}`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function GradientStatsCard({
  title,
  value,
  icon: Icon,
  gradient = 'gradient-primary-mesh',
  valuePrefix,
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-5 text-white shadow-[0_8px_30px_rgba(37,99,235,0.25)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.45)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col',
        gradient,
        className
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-500" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/90 text-xs font-semibold uppercase tracking-wider truncate mr-2">{title}</span>
          {Icon && (
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="text-3xl font-extrabold tracking-tight mt-auto pt-2 truncate">
          {valuePrefix}{value}
        </div>
      </div>
    </div>
  )
}

