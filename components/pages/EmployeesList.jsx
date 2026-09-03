'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Eye, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { AddEmployeePage } from './AddEmployeePage'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi } from '@/services/departmentApi'
import { formatDate } from '@/lib/utils'

export function EmployeesList({ basePath, hideHeader }) {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptFilter, setDeptFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    departmentApi.getAll().then((res) => setDepartments(res.data.data))
  }, [])

  function load() {
    setLoading(true)
    const params = deptFilter !== 'All' ? { departmentId: deptFilter, size: 100 } : { size: 100 }
    employeeApi.getAll(params)
      .then((res) => setEmployees(res.data.data.content))
      .finally(() => setLoading(false))
  }

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

  useEffect(load, [deptFilter])

  const columns = [
    { header: 'Employee', accessor: 'firstName', render: (_, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-slate-400">{row.employeeCode} · {row.email}</p>
        </div>
      </div>
    ) },
    { header: 'Department', accessor: 'department', render: (v) => v?.name || '—' },
    { header: 'Designation', accessor: 'designation', render: (v) => v?.name || '—' },
    { header: 'Join Date', accessor: 'joiningDate', render: (v) => formatDate(v) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Actions', accessor: '_id', render: (_, row) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/${row._id}`) }} className="text-slate-400 hover:text-blue-500 p-1.5 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/${row._id}?edit=true`) }} className="text-slate-400 hover:text-blue-500 p-1.5 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(row) }} className="text-slate-400 hover:text-red-500 p-1.5 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {!hideHeader && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">
              Employees
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Manage your organization's workforce</p>
          </div>
          <button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => setDeptFilter('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${deptFilter === 'All' ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm'}`}
          >
            All Departments
          </button>
          {departments.map((d) => (
            <button
              key={d._id}
              onClick={() => setDeptFilter(d._id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${deptFilter === d._id ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm'}`}
            >
              {d.name}
            </button>
          ))}
        </div>
        
        {hideHeader && (
          <button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm flex-shrink-0 ml-4" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={employees}
        isLoading={loading}
        onRowClick={(row) => router.push(`${basePath}/${row._id}`)}
        searchPlaceholder="Search employees..."
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
