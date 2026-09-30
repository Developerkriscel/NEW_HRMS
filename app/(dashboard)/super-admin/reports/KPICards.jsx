import { TrendingUp, Users, Building, Activity, RotateCw, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function KPICards({ data, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4"></div>
            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded mb-2"></div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const kpis = [
    {
      title: 'Collected Revenue',
      value: formatCurrency(data?.collectedRevenue || 0),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Active Companies',
      value: data?.activeCompanies || 0,
      icon: Building,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Pending Revenue',
      value: formatCurrency(data?.pendingRevenue || 0),
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Refunds',
      value: formatCurrency(data?.refundAmount || 0),
      icon: AlertCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    },
    {
      title: 'Renewals (Invoices)',
      value: data?.renewals || 0,
      icon: RotateCw,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.bg}`}>
            <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpi.title}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{kpi.value}</p>
        </div>
      ))}
    </div>
  )
}
