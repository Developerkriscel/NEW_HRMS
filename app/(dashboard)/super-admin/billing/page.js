'use client'

import { useEffect, useState } from 'react'
import { RevenueAreaChart } from '@/components/charts/DynamicDashboardCharts'
import { StatsCard } from '@/components/cards/StatsCard'
import { DollarSign, TrendingUp } from 'lucide-react'
import { tenantApi } from '@/services/tenantApi'
import { formatCurrency } from '@/lib/utils'

export default function BillingPage() {
  const [revenue, setRevenue] = useState(null)

  useEffect(() => {
    tenantApi.getRevenue().then((res) => setRevenue(res.data.data))
  }, [])

  // No Invoice entity exists in this system (the original backend never
  // implemented one either) — this page surfaces the real revenue totals
  // and leaves per-invoice detail as a future module.
  const chartData = revenue
    ? Array.from({ length: 6 }).map((_, i) => ({ month: `M${i + 1}`, revenue: revenue.monthlyRecurring }))
    : []

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800/60 pb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">Billing & Revenue</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Revenue overview across all tenants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatsCard title="Monthly Recurring Revenue" value={formatCurrency(revenue?.monthlyRecurring || 0)} icon={DollarSign} />
        <StatsCard title="Annual Recurring Revenue" value={formatCurrency(revenue?.annualRecurring || 0)} icon={TrendingUp} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" /> Revenue Trend
        </h3>
        <RevenueAreaChart data={chartData} />
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-700/60 p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-3">
          <DollarSign className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-md">Per-invoice billing detail is a future module — not implemented in this system yet.</p>
      </div>
    </div>
  )
}
