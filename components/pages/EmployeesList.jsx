'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Edit, Eye, GraduationCap, Plus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { AddEmployeePage } from './AddEmployeePage'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

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

function isIntern(employee) {
  return String(employee.employmentType || '').toLowerCase().includes('intern')
}

function filterByTab(employee, tab) {
  if (tab === 'hr') return employee.role === 'HR_MANAGER'
  if (tab === 'managers') return employee.role === 'MANAGER'
  if (tab === 'employees') return employee.role === 'EMPLOYEE' && !isIntern(employee)
  if (tab === 'interns') return isIntern(employee)
  return true
}

function countForTab(employees, tab) {
  return employees.filter((employee) => filterByTab(employee, tab)).length
}

export function EmployeesList({ basePath, hideHeader }) {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    employeeApi.getAll({ size: 1000 })
      .then((res) => setEmployees(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredEmployees = useMemo(() => (
    employees.filter((employee) => filterByTab(employee, activeDirectoryTab))
  ), [employees, activeDirectoryTab])

  const pageTitle = `${DIRECTORY_TABS.find((tab) => tab.id === activeDirectoryTab)?.label || 'All'} Directory`

  async function handleDelete() {
    if (!employeeToDelete) return
    setDeleting(true)
    try {
      await employeeApi.delete(employeeToDelete._id)
      setEmployeeToDelete(null)
      load()
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
    { header: 'Type', accessor: 'employmentType', render: (v) => v || '-' },
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
            <h1 className="bg-gradient-to-r from-slate-950 to-slate-600 bg-clip-text text-3xl font-black tracking-tight text-transparent dark:from-white dark:to-slate-300">
              Employees
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Manage your organization's workforce</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{pageTitle}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Grouped by HR, managers, employees, and interns for faster access.</p>
          </div>
          {hideHeader && (
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          )}
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                    {countForTab(employees, tab.id)}
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
        data={filteredEmployees}
        isLoading={loading}
        onRowClick={(row) => router.push(`${basePath}/${row._id}`)}
        searchPlaceholder={`Search ${pageTitle.toLowerCase()}...`}
        emptyMessage="No employees found in this group"
      />

      {showAddModal && (
        <AddEmployeePage basePath={basePath} onClose={() => { setShowAddModal(false); load() }} />
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
