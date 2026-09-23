'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Edit, Eye, GraduationCap, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { AddEmployeePage } from './AddEmployeePage'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 5

const DIRECTORY_TABS = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'hr', label: 'HR', icon: ShieldCheck },
  { id: 'managers', label: 'Managers', icon: Briefcase },
  { id: 'employees', label: 'Employees', icon: UserRound },
  { id: 'interns', label: 'Interns', icon: GraduationCap },
]

function fullName(employee) {
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
}

function roleLabel(role) {
  return String(role || 'EMPLOYEE').replace(/_/g, ' ')
}

function humanizeEnum(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function EmployeesList({ basePath, hideHeader }) {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('all')
  const [page, setPage] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [groupCounts, setGroupCounts] = useState({ all: 0, hr: 0, managers: 0, employees: 0, interns: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const observerTarget = useRef(null)

  const load = useCallback((nextPage = 0, append = false, tab = activeDirectoryTab) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    const params = {
      page: nextPage,
      size: PAGE_SIZE,
      ...(tab !== 'all' ? { group: tab } : {}),
    }
    employeeApi.getAll(params)
      .then((res) => {
        const data = res.data.data || {}
        const rows = data.content || []
        setEmployees((prev) => append ? [...prev, ...rows] : rows)
        setTotalElements(data.totalElements || 0)
        setGroupCounts(data.groupCounts || { all: 0, hr: 0, managers: 0, employees: 0, interns: 0 })
        setPage(nextPage)
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }, [activeDirectoryTab])

  useEffect(() => {
    load(0, false, activeDirectoryTab)
  }, [activeDirectoryTab, load])

  const pageTitle = `${DIRECTORY_TABS.find((tab) => tab.id === activeDirectoryTab)?.label || 'All'} Directory`
  const hasMore = employees.length < totalElements

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          load(page + 1, true, activeDirectoryTab)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading, loadingMore, page, activeDirectoryTab, load])

  async function handleDelete() {
    if (!employeeToDelete) return
    setDeleting(true)
    try {
      await employeeApi.delete(employeeToDelete._id)
      setEmployeeToDelete(null)
      load(0, false, activeDirectoryTab)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      header: 'Employee',
      accessor: 'firstName',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={fullName(row)} size="sm" />
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{fullName(row)}</p>
            <p className="text-xs font-medium text-slate-400">{row.employeeCode || '-'} - {row.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Department', accessor: 'department', render: (v) => v?.name || '-' },
    { header: 'Role', accessor: 'role', render: (v) => <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">{roleLabel(v)}</span> },
    { header: 'Type', accessor: 'employmentType', render: (v) => humanizeEnum(v) },
    { header: 'Join Date', accessor: 'joiningDate', render: (v) => formatDate(v) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    {
      header: 'Actions',
      accessor: '_id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/${row._id}`) }} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-900/20" title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/${row._id}?edit=true`) }} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-900/20" title="Edit">
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(row) }} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-900/20" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {!hideHeader && (
        <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">
              Employees
            </h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      )}

      <div className="relative">
        
        

        <div className="relative mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 mb-4">
          {DIRECTORY_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeDirectoryTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDirectoryTab(tab.id)}
                className={`group rounded-3xl border p-4 text-left transition-all ${
                  active
                    ? 'border-blue-200 bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                    : 'border-slate-200 bg-white/90 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {groupCounts[tab.id] || 0}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black">{tab.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        isLoading={loading}
        onRowClick={(row) => router.push(`${basePath}/${row._id}`)}
        searchPlaceholder={`Search ${pageTitle.toLowerCase()}...`}
        emptyMessage="No employees found in this group"
        pageSize={10000}
      />

      {hasMore && !loading && (
        <div ref={observerTarget} className="flex justify-center p-4">
          {loadingMore && <span className="text-slate-500 text-sm font-semibold animate-pulse">Loading more employees...</span>}
        </div>
      )}

      {showAddModal && (
        <AddEmployeePage basePath={basePath} onClose={() => { setShowAddModal(false); load(0, false, activeDirectoryTab) }} />
      )}

      <ConfirmDialog
        open={!!employeeToDelete}
        title="Delete Employee"
        description={`Are you sure you want to delete ${employeeToDelete?.firstName} ${employeeToDelete?.lastName}? This action cannot be undone.`}
        confirmLabel="Delete Employee"
        variant="danger"
        loading={deleting}
        requireReason={false}
        onConfirm={handleDelete}
        onClose={() => setEmployeeToDelete(null)}
      />
    </div>
  )
}
