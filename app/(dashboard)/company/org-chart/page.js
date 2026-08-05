'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { employeeApi } from '@/services/employeeApi'

function employeeName(employee) {
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
}

function managerIdOf(employee) {
  const manager = employee.reportingManager
  if (!manager) return null
  return typeof manager === 'string' ? manager : manager._id
}

function OrgNode({ employee, childrenByManager }) {
  const children = childrenByManager[String(employee._id)] || []

  return (
    <div className="flex flex-col items-center">
      <div className="min-w-56 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar name={employeeName(employee)} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{employeeName(employee)}</p>
            <p className="truncate text-xs text-slate-400">{employee.employeeCode || employee.email}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{employee.role}</Badge>
          <Badge>{employee.status}</Badge>
        </div>
      </div>

      {children.length > 0 && (
        <>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-wrap justify-center gap-4">
            {children.map((child) => (
              <OrgNode key={child._id} employee={child} childrenByManager={childrenByManager} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    employeeApi.getAll({ size: 500 })
      .then((res) => setEmployees(res.data.data.content || []))
      .finally(() => setLoading(false))
  }, [])

  const { roots, childrenByManager } = useMemo(() => {
    const byManager = {}
    const employeeIds = new Set(employees.map((employee) => String(employee._id)))

    for (const employee of employees) {
      const managerId = managerIdOf(employee)
      if (managerId && employeeIds.has(String(managerId))) {
        byManager[String(managerId)] = [...(byManager[String(managerId)] || []), employee]
      }
    }

    return {
      childrenByManager: byManager,
      roots: employees.filter((employee) => {
        const managerId = managerIdOf(employee)
        return !managerId || !employeeIds.has(String(managerId))
      }),
    }
  }, [employees])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Org Chart</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Built from employee reporting manager relationships</p>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : employees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
          No employees found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6">
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" /> {employees.length} employee(s)
          </div>
          <div className="flex min-w-max flex-wrap items-start justify-center gap-8">
            {roots.map((root) => (
              <OrgNode key={root._id} employee={root} childrenByManager={childrenByManager} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
