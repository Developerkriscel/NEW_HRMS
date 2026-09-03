'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Plus, Search, Building2, Mail, Users, Database, ShieldCheck, ArrowUpRight, Sparkles } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const getPlatformApi = async () => (await import('@/services/platformApi')).platformApi
const getTenantApi = async () => (await import('@/services/tenantApi')).tenantApi

const STATUS_TABS = ['All', 'TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED']
const PAGE_SIZE = 20

const COLUMNS = [
  { key: 'companyName', label: 'Company Name', sortable: true },
  { key: 'adminEmail', label: 'Primary Admin', sortable: false },
  { key: 'plan', label: 'Plan Tier', sortable: false },
  { key: 'employeeLimit', label: 'Seats / Limit', sortable: true },
  { key: 'status', label: 'Account Status', sortable: true },
  { key: 'provisioningStatus', label: 'Cluster State', sortable: true },
  { key: 'createdAt', label: 'Registered On', sortable: true },
]

function TenantStatusPill({ status }) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Active
      </span>
    )
  }
  if (s === 'TRIAL' || s === 'GRACE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {s === 'TRIAL' ? 'Free Trial' : 'Grace Period'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Suspended
    </span>
  )
}

function PlanBadge({ planName }) {
  const name = planName || 'Enterprise'
  const isEnterprise = name.toLowerCase().includes('enterprise')
  const isPro = name.toLowerCase().includes('pro')
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold tracking-tight",
      isEnterprise ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40" :
      isPro ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40" :
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
    )}>
      {isEnterprise && <Sparkles className="w-3 h-3 text-purple-500" />}
      {name}
    </span>
  )
}

export default function TenantsPage() {
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [rows, setRows] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [status, setStatus] = useState('All')
  const [planFilter, setPlanFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function load() {
    setLoading(true)
    setForbidden(false)
    const params = { page, size: PAGE_SIZE, sortBy, sortDir }
    if (status !== 'All') params.status = status
    if (planFilter) params.plan = planFilter
    if (search) params.search = search

    try {
      const platformApi = await getPlatformApi()
      const res = await platformApi.getTenants(params)
      setRows(res.data.data.content)
      setTotalPages(res.data.data.totalPages)
      setTotalElements(res.data.data.totalElements)
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, status, planFilter, search, sortBy, sortDir])

  useEffect(() => {
    let active = true
    const loadPlans = async () => {
      try {
        const tenantApi = await getTenantApi()
        const res = await tenantApi.getPlans()
        if (active) setPlans(res.data.data || [])
      } catch {
        if (active) setPlans([])
      }
    }
    loadPlans()
    return () => { active = false }
  }, [])

  function handleSort(key) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function handleStatusTab(tab) {
    setStatus(tab)
    setPage(0)
  }

  if (forbidden) {
    return <PermissionDenied requiredPermission="tenant.view" message="You don't have permission to view companies." />
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800/60 pb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">Organizations</h1>
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 uppercase tracking-widest shadow-sm">
              {totalElements} Total
            </span>
          </div>
        </div>

        {hasPermission('tenant.create') && (
          <button 
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all duration-300 active:scale-95 mt-2 sm:mt-0"
            onClick={() => router.push('/super-admin/tenants/create')}
          >
            <Plus className="w-4 h-4 stroke-[3]" /> 
            <span>Create Organization</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Dropdown */}
        <select 
          className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full lg:w-48"
          value={status} 
          onChange={(e) => handleStatusTab(e.target.value)}
        >
          {STATUS_TABS.map((tab) => (
            <option key={tab} value={tab}>{tab.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Search & Plan Selector */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              className="w-full bg-white dark:bg-slate-900 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-semibold placeholder:text-slate-400"
              placeholder="Search by company, code, or domain..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
            />
          </div>

          <select 
            className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            value={planFilter} 
            onChange={(e) => { setPlanFilter(e.target.value); setPage(0) }}
          >
            <option value="">All Plans</option>
            {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main Companies Table Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-slate-800/80 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn("pb-4 px-2 font-black", col.sortable && "cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200 transition-colors")}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {sortBy === col.key && (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-20 text-center">
                    <div className="flex justify-center"><LoadingSpinner /></div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-20 text-center text-sm font-semibold text-slate-400">
                    No organizations match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr 
                    key={row._id} 
                    onClick={() => router.push(`/super-admin/tenants/${row._id}`)} 
                    className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-200"
                  >
                    {/* Company Column */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                          {row.companyName ? row.companyName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {row.companyName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            {row.tenantCode} {row.subdomain ? <span className="opacity-60">· {row.subdomain}.nexahr.io</span> : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Primary Admin */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Mail className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="truncate max-w-[160px]">{row.adminEmail || 'admin@tenant.io'}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-2">
                      <PlanBadge planName={row.plan?.name} />
                    </td>

                    {/* Employee Limit */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.employeeLimit || 250} seats</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-2">
                      <TenantStatusPill status={row.status} />
                    </td>

                    {/* Provisioning */}
                    <td className="py-4 px-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                        <Database className="w-3 h-3 text-emerald-500" />
                        <span>{row.provisioningStatus || 'COMPLETED'}</span>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="py-4 px-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Page {page + 1} of {totalPages} · {totalElements} organizations</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setPage((p) => Math.max(0, p - 1))} 
                disabled={page === 0} 
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} 
                disabled={page >= totalPages - 1} 
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
