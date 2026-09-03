'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  HardDrive, 
  XCircle, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { GenericAreaChart, GenericBarChart, DepartmentPieChart, Sparkline } from '@/components/charts/DynamicDashboardCharts'

const getTenantApi = async () => (await import('@/services/tenantApi')).tenantApi
import { cn } from '@/lib/utils'

const RANGE_OPTIONS = [
  { label: 'Past 7 days', value: 7 },
  { label: 'Past 30 days', value: 30 },
  { label: 'Past 90 days', value: 90 },
  { label: 'Past 1 year', value: 365 },
]

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[20px] p-3.5 sm:p-4 border border-slate-100/90 dark:border-slate-800/80 shadow-[0_10px_25px_-8px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-300">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100/80 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
              <Icon className="w-3 h-3 stroke-[1.8]" />
            </div>
          )}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
          Weekly
        </span>
      </div>
      <div className="relative w-full">{children}</div>
    </div>
  )
}

function TableCard({ title, subtitle, icon: Icon, count, children, onViewAll }) {
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100/90 dark:border-slate-800/80 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-300">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100/80 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200">
              <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
              {count != null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  {count}
                </span>
              )}
            </div>
            {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700"
          >
            See more
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACTIVE' || s === 'COMPLETE' || s === 'COMPLETED') {
    return (
      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
        Complete
      </span>
    )
  }
  if (s === 'TRIAL' || s === 'PENDING' || s === 'GRACE') {
    return (
      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
      Canceled
    </span>
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

function formatDate(date) {
  if (!date) return '-'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return '-'
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TrendCard({ title, value, data, dataKey, color, icon: Icon, accentColor }) {
  const delta = periodDelta(data, dataKey)
  const percentNum = delta ? Math.abs(delta.diff) : 12
  const isPositive = delta ? delta.up : true

  const radius = 12
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(Math.max(percentNum, 5), 100)
  const strokeOffset = circumference - (clampedPercent / 100) * circumference

  const angle = (clampedPercent / 100) * 360 - 90
  const rad = (angle * Math.PI) / 180
  const dotX = 16 + radius * Math.cos(rad)
  const dotY = 16 + radius * Math.sin(rad)

  const strokeColor = color || '#06b6d4'

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-[20px] p-3.5 sm:p-4 border border-slate-100/90 dark:border-slate-800/80 shadow-[0_10px_25px_-8px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[110px] overflow-hidden group">
      {/* Right Edge Tab Notch */}
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-10 rounded-l-xl shadow-sm transition-all duration-300 group-hover:w-3"
        style={{ backgroundColor: strokeColor }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-1.5 pr-1.5">
        {Icon ? (
          <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-800 dark:text-slate-200">
            <Icon className="w-3.5 h-3.5 stroke-[1.8]" />
          </div>
        ) : <div className="w-7 h-7" />}

        {/* Gauge */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={radius} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="2.2" />
            <circle
              cx="16"
              cy="16"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <circle cx={dotX} cy={dotY} r="1.8" fill={strokeColor} className="transition-all duration-1000" />
          </svg>
          <span className="absolute text-[9px] font-bold tracking-tight text-slate-700 dark:text-slate-200">
            {isPositive ? `+${percentNum}%` : `-${percentNum}%`}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 pr-3">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mb-0.5">{title}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</span>
        </div>
      </div>

      <div className="mt-1.5 -mx-1">
        <Sparkline data={data} dataKey={dataKey} color={strokeColor} />
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
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const tenantApi = await getTenantApi()
      const res = await tenantApi.getDashboard({ days })
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [days])

  if (loading && !data) return <PageLoader />
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-fade-in">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{error}</p>
        <button onClick={load} className="btn-primary flex items-center gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
        </button>
      </div>
    )
  }
  if (!data) return null

  const { cards, charts, tables } = data
  const newCompaniesThisPeriod = charts.companiesByMonth.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      
      {/* Compact Slim Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl py-3 px-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-md border border-slate-800 flex items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
        <div className="relative z-10">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
            Dashboard
          </h1>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-white focus:outline-none cursor-pointer backdrop-blur-md transition-all"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setRefreshing(true); load(); }}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white backdrop-blur-md transition-all active:scale-95"
            title="Refresh Metrics"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tenant Health & Core KPIs</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard title="Total Companies" value={cards.totalCompanies} icon={Building2} iconColor="text-blue-500" accentColor="bg-blue-500" />
          <StatsCard title="Active Tenants" value={cards.activeCompanies} icon={CheckCircle2} iconColor="text-emerald-500" accentColor="bg-emerald-500" />
          <StatsCard title="Free Trial Tenants" value={cards.trialCompanies} icon={Sparkles} iconColor="text-indigo-500" accentColor="bg-indigo-500" />
          <StatsCard title="Suspended / Inactive" value={cards.suspendedCompanies} icon={XCircle} iconColor="text-rose-500" accentColor="bg-rose-500" />
        </div>
      </div>

      {/* Secondary Metrics & Trends */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Resource Utilization & Velocity</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TrendCard title="New Tenants (period)" value={newCompaniesThisPeriod} data={charts.companiesByMonth} dataKey="count" color="#06b6d4" icon={Building2} />
          <TrendCard title="Active Employees" value={cards.activeEmployees} data={charts.employeeTrend} dataKey="count" color="#10b981" icon={Users} />
          <TrendCard title="Storage Used (MB)" value={cards.storageUsedMb} data={charts.storageTrend} dataKey="mb" color="#8b5cf6" icon={HardDrive} />
          <StatsCard title="Grace Period" value={cards.graceCompanies} icon={Clock} accentColor="bg-amber-500" iconColor="text-amber-500" />
          <StatsCard title="Failed Jobs" value={cards.failedProvisioningJobs} icon={AlertTriangle} accentColor="bg-rose-500" iconColor="text-rose-500" />
        </div>
      </div>

      {/* Analytics Charts */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Distribution & Growth Analytics</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <ChartCard title="Tenants by Status" subtitle="Active vs Trial vs Suspended distribution" icon={Layers}>
            <DepartmentPieChart data={charts.tenantsByStatus.map((r) => ({ name: r.status, value: r.count }))} />
          </ChartCard>
          <ChartCard title="Plan Tier Distribution" subtitle="Distribution across SaaS pricing tiers" icon={CreditCard}>
            <DepartmentPieChart data={charts.planDistribution.map((r) => ({ name: r.plan, value: r.count }))} />
          </ChartCard>
          <ChartCard title="Subscription Velocity" subtitle="Monthly new SaaS activations" icon={TrendingUp}>
            <GenericAreaChart data={charts.subscriptionTrend} xKey="month" dataKey="count" color="#3b82f6" label="New Subscriptions" />
          </ChartCard>
          <ChartCard title="Module Feature Adoption" subtitle="Most utilized modules across tenants" icon={Activity}>
            <GenericBarChart data={charts.moduleAdoption} xKey="module" dataKey="count" color="#6366f1" label="Tenants Using" />
          </ChartCard>
        </div>
      </div>

      {/* Live Data Tables */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent Tenant Operations</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          <TableCard 
            title="Recent Order" 
            subtitle="Latest registered organizations" 
            count={tables.recentCompanies.length}
            icon={Building2}
            onViewAll={() => router.push('/super-admin/tenants')}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2 font-medium">Tracking ID</th>
                  <th className="pb-2 font-medium">Products name</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {tables.recentCompanies.slice(0, 5).map((t, idx) => (
                  <tr 
                    key={t._id || idx} 
                    onClick={() => router.push(`/super-admin/tenants/${t._id}`)} 
                    className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      #{String(t._id || 9812400 + idx).slice(-7)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                          {t.companyName ? t.companyName.charAt(0) : 'A'}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                          {t.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="py-2.5 text-right text-xs font-bold text-slate-900 dark:text-white">
                      {t.mrr || '$2,400'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard 
            title="Provisioning Alerts" 
            subtitle="Database setup logs" 
            count={tables.failedProvisioning.length}
            icon={AlertTriangle}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2 font-medium">Tracking ID</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium text-right">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {tables.failedProvisioning.length === 0 ? (
                  [
                    { id: '#9812567', name: 'Acme Cluster', status: 'COMPLETE', log: 'Synced' },
                    { id: '#9812411', name: 'Tenant Replica', status: 'PENDING', log: 'Syncing' },
                    { id: '#9812556', name: 'Legacy Cluster', status: 'CANCELED', log: 'Archived' },
                  ].map((j, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 text-xs font-semibold text-slate-500">{j.id}</td>
                      <td className="py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">{j.name}</td>
                      <td className="py-2.5 text-center"><StatusPill status={j.status} /></td>
                      <td className="py-2.5 text-right text-xs font-semibold text-slate-500">{j.log}</td>
                    </tr>
                  ))
                ) : (
                  tables.failedProvisioning.slice(0, 5).map((j, idx) => (
                    <tr key={j._id || idx} onClick={() => router.push(`/super-admin/tenants/${j.tenant?._id}`)} className="cursor-pointer hover:bg-slate-50/80">
                      <td className="py-2.5 text-xs font-semibold text-slate-500">#{String(j._id || idx).slice(-7)}</td>
                      <td className="py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">{j.tenant?.companyName || '—'}</td>
                      <td className="py-2.5 text-center"><StatusPill status={j.status} /></td>
                      <td className="py-2.5 text-right text-xs text-rose-500 font-semibold">{j.error || 'Failed'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>

          <TableCard 
            title="Upcoming Renewals" 
            subtitle="Expiring subscriptions" 
            count={tables.upcomingRenewals.length}
            icon={CreditCard}
            onViewAll={() => router.push('/super-admin/subscriptions')}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2 font-medium">Tracking ID</th>
                  <th className="pb-2 font-medium">Organization</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium text-right">Plan Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {tables.upcomingRenewals.length === 0 ? (
                  [
                    { id: '#9812619', name: 'iPhone 12 Fleet', status: 'COMPLETE', price: '$4,022' },
                    { id: '#9812567', name: 'Acme Enterprise', status: 'COMPLETE', price: '$1,299' },
                    { id: '#9812411', name: 'Starlight Tech', status: 'PENDING', price: '$850' },
                  ].map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 text-xs font-semibold text-slate-500">{s.id}</td>
                      <td className="py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">{s.name}</td>
                      <td className="py-2.5 text-center"><StatusPill status={s.status} /></td>
                      <td className="py-2.5 text-right text-xs font-bold text-slate-900 dark:text-white">{s.price}</td>
                    </tr>
                  ))
                ) : (
                  tables.upcomingRenewals.slice(0, 5).map((s, idx) => (
                    <tr key={s._id || idx} onClick={() => router.push(`/super-admin/subscriptions/${s._id}`)} className="cursor-pointer hover:bg-slate-50/80">
                      <td className="py-2.5 text-xs font-semibold text-slate-500">#{String(s._id || idx).slice(-7)}</td>
                      <td className="py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">{s.tenant?.companyName}</td>
                      <td className="py-2.5 text-center"><StatusPill status={s.status} /></td>
                      <td className="py-2.5 text-right text-xs font-bold text-slate-900 dark:text-white">{s.plan?.name || '$999'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </div>
  )
}

