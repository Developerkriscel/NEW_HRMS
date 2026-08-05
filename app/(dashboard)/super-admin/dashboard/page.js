'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, HardDrive, XCircle, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { StatsCard, GradientStatsCard } from '@/components/cards/StatsCard'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { GenericAreaChart, GenericBarChart, DepartmentPieChart, Sparkline } from '@/components/charts/DynamicDashboardCharts'
import { tenantApi } from '@/services/tenantApi'
import { formatDate } from '@/lib/utils'

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
]

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function TableCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</div>
      {children}
    </div>
  )
}

function periodDelta(data, valueKey) {
  if (!data?.length) return null
  const first = data[0]?.[valueKey] ?? 0
  const last = data[data.length - 1]?.[valueKey] ?? 0
  if (data.length < 2 || first === last) return null
  const diff = last - first
  return { diff, up: diff >= 0 }
}

function TrendCard({ title, value, data, dataKey, color }) {
  const delta = periodDelta(data, dataKey)
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {delta && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${delta.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {delta.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta.diff)} over period
          </span>
        )}
      </div>
      <div className="mt-2 -mx-1">
        <Sparkline data={data} dataKey={dataKey} color={color} />
      </div>
    </div>
  )
}

export default function SuperAdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(90)

  function load() {
    setLoading(true)
    setError(null)
    tenantApi.getDashboard({ days })
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [days])

  if (loading && !data) return <PageLoader />
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    )
  }
  if (!data) return null

  const { cards, charts, tables } = data
  const newCompaniesThisPeriod = charts.companiesByMonth.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cross-tenant metrics — aggregated, no individual employee data</p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setDays(opt.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Hero + secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientStatsCard title="Total Companies" value={cards.totalCompanies} icon={Building2} />
        <StatsCard title="Active" value={cards.activeCompanies} icon={Building2} />
        <StatsCard title="Trial" value={cards.trialCompanies} icon={Building2} />
        <StatsCard title="Suspended" value={cards.suspendedCompanies} icon={XCircle} />
      </div>

      {/* Trend sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TrendCard title="New Companies (period)" value={newCompaniesThisPeriod} data={charts.companiesByMonth} dataKey="count" color="#2563eb" />
        <TrendCard title="Active Employees" value={cards.activeEmployees} data={charts.employeeTrend} dataKey="count" color="#0ea5e9" />
        <TrendCard title="Storage Used (MB)" value={cards.storageUsedMb} data={charts.storageTrend} dataKey="mb" color="#6366f1" />
      </div>

      {/* Supplementary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Grace Period" value={cards.graceCompanies} icon={Building2} />
        <StatsCard title="Storage Limit" value={`${cards.storageLimitMb} MB`} icon={HardDrive} />
        <StatsCard title="Active Plans" value={cards.totalPlans} icon={CreditCard} />
        <StatsCard title="Failed Provisioning" value={cards.failedProvisioningJobs} icon={XCircle} />
      </div>

      {/* Detailed charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tenants by Status"><DepartmentPieChart data={charts.tenantsByStatus.map((r) => ({ name: r.status, value: r.count }))} /></ChartCard>
        <ChartCard title="Plan Distribution"><DepartmentPieChart data={charts.planDistribution.map((r) => ({ name: r.plan, value: r.count }))} /></ChartCard>
        <ChartCard title="Subscription Trend"><GenericAreaChart data={charts.subscriptionTrend} xKey="month" dataKey="count" color="#2563eb" label="New Subscriptions" /></ChartCard>
        <ChartCard title="Module Adoption"><GenericBarChart data={charts.moduleAdoption} xKey="module" dataKey="count" color="#2563eb" label="Tenants" /></ChartCard>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TableCard title="Recently Created Companies">
          <table className="data-table">
            <thead><tr><th>Company</th><th>Status</th><th>Provisioning</th><th>Created</th></tr></thead>
            <tbody>
              {tables.recentCompanies.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-slate-400">No companies yet</td></tr> : tables.recentCompanies.map((t) => (
                <tr key={t._id} onClick={() => router.push(`/super-admin/tenants/${t._id}`)} className="cursor-pointer">
                  <td className="font-medium text-slate-800 dark:text-slate-100">{t.companyName}</td>
                  <td><Badge>{t.status}</Badge></td>
                  <td><Badge>{t.provisioningStatus}</Badge></td>
                  <td className="text-slate-500 dark:text-slate-400">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Failed Provisioning Jobs">
          <table className="data-table">
            <thead><tr><th>Company</th><th>Status</th><th>Error</th></tr></thead>
            <tbody>
              {tables.failedProvisioning.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400">None — all provisioning succeeded</td></tr> : tables.failedProvisioning.map((j) => (
                <tr key={j._id} onClick={() => router.push(`/super-admin/tenants/${j.tenant?._id}`)} className="cursor-pointer">
                  <td className="font-medium text-slate-800 dark:text-slate-100">{j.tenant?.companyName || '—'}</td>
                  <td><Badge>{j.status}</Badge></td>
                  <td className="text-red-500 text-xs">{j.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Upcoming Renewals (30 days)">
          <table className="data-table">
            <thead><tr><th>Company</th><th>Plan</th><th>Renews</th></tr></thead>
            <tbody>
              {tables.upcomingRenewals.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400">Nothing renewing soon</td></tr> : tables.upcomingRenewals.map((s) => (
                <tr key={s._id} onClick={() => router.push(`/super-admin/subscriptions/${s._id}`)} className="cursor-pointer">
                  <td className="font-medium text-slate-800 dark:text-slate-100">{s.tenant?.companyName}</td>
                  <td className="text-slate-500 dark:text-slate-400">{s.plan?.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">{formatDate(s.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  )
}
