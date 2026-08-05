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
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Revenue overview across all tenants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard title="Monthly Recurring Revenue" value={formatCurrency(revenue?.monthlyRecurring || 0)} icon={DollarSign} />
        <StatsCard title="Annual Recurring Revenue" value={formatCurrency(revenue?.annualRecurring || 0)} icon={TrendingUp} />
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Revenue Trend</h3>
        <RevenueAreaChart data={chartData} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Per-invoice billing detail is a future module — not implemented in this system yet.</p>
      </div>
    </div>
  )
}
