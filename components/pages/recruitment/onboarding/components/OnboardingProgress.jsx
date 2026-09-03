import React from 'react'

export function OnboardingProgress({ progress, showLabel = true, size = 'md', className = '' }) {
  const getGradient = () => {
    if (progress === 100) return 'from-emerald-400 to-emerald-500'
    if (progress > 50) return 'from-blue-400 to-indigo-500'
    if (progress > 0) return 'from-amber-400 to-orange-500'
    return 'bg-slate-300 dark:bg-slate-600'
  }

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'
  const textClass = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className={`font-semibold text-slate-700 dark:text-slate-300 ${textClass}`}>Progress</span>
          <span className={`font-bold ${progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'} ${textClass}`}>
            {progress}%
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${heightClass}`}>
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${getGradient()}`} 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
