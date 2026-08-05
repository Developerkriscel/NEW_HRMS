'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Plus, Search, Database } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const STATUS_TABS = ['All', 'TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED']
const PAGE_SIZE = 20

const COLUMNS = [
  { key: 'companyName', label: 'Company', sortable: true },
  { key: 'adminEmail', label: 'Primary Admin', sortable: false },
  { key: 'plan', label: 'Plan', sortable: false },
  { key: 'employeeLimit', label: 'Employee Limit', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'provisioningStatus', label: 'Provisioning', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
]

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

  function load() {
    setLoading(true)
    setForbidden(false)
    const params = { page, size: PAGE_SIZE, sortBy, sortDir }
    if (status !== 'All') params.status = status
    if (planFilter) params.plan = planFilter
    if (search) params.search = search

    platformApi.getTenants(params)
      .then((res) => {
        setRows(res.data.data.content)
        setTotalPages(res.data.data.totalPages)
        setTotalElements(res.data.data.totalElements)
      })
      .catch((err) => {
        if (err.response?.status === 403) setForbidden(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, status, planFilter, search, sortBy, sortDir])

  useEffect(() => {
    tenantApi.getPlans().then((res) => setPlans(res.data.data || [])).catch(() => setPlans([]))
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
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{totalElements} companies on the platform</p>
        </div>
        {hasPermission('tenant.create') && (
          <button className="btn-primary" onClick={() => router.push('/super-admin/tenants/create')}>
            <Plus className="w-4 h-4" /> Create Company
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleStatusTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Search company, code, subdomain, admin email..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
          />
        </div>
        <select className="input-field sm:max-w-xs" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(0) }}>
          <option value="">All Plans</option>
          {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={col.sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100' : ''}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLUMNS.length} className="py-12 text-center"><div className="flex justify-center"><LoadingSpinner /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={COLUMNS.length} className="py-12 text-center text-sm text-slate-400">No companies match these filters</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} onClick={() => router.push(`/super-admin/tenants/${row._id}`)} className="cursor-pointer">
                    <td>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{row.companyName}</p>
                      <p className="text-xs text-slate-400">{row.tenantCode}{row.subdomain ? ` · ${row.subdomain}` : ''}</p>
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">{row.adminEmail || '-'}</td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">{row.plan?.name || '-'}</td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">{row.employeeLimit}</td>
                    <td><Badge>{row.status}</Badge></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <Badge>{row.provisioningStatus}</Badge>
                      </div>
                    </td>
                    <td className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
            <span>Page {page + 1} of {totalPages} · {totalElements} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
