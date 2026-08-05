'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi } from '@/services/departmentApi'
import { formatDate } from '@/lib/utils'

export function EmployeesList({ basePath }) {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [deptFilter, setDeptFilter] = useState('All')
  const [loading, setLoading] = useState(true)

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
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your organization's workforce</p>
        </div>
        <button className="btn-primary" onClick={() => router.push('/company/employees/add')}>
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setDeptFilter('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${deptFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
        >
          All Departments
        </button>
        {departments.map((d) => (
          <button
            key={d._id}
            onClick={() => setDeptFilter(d._id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${deptFilter === d._id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={employees}
        isLoading={loading}
        onRowClick={(row) => router.push(`${basePath}/${row._id}`)}
        searchPlaceholder="Search employees..."
      />
    </div>
  )
}
