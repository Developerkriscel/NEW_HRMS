'use client'

import { useEffect, useState } from 'react'
import { employeeApi } from '@/services/employeeApi'
import { Avatar } from '@/components/common/Avatar'
import { ChevronDown, ChevronRight, Users, Network } from 'lucide-react'

function TreeNode({ employee, childrenNodes, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = childrenNodes && childrenNodes.length > 0

  return (
    <div className="relative pl-6 sm:pl-8 py-2">
      {/* Vertical line connecting to siblings */}
      <div className="absolute left-[11px] sm:left-[15px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/50" />
      
      {/* Horizontal line connecting to parent */}
      <div className="absolute left-[11px] sm:left-[15px] top-[28px] w-4 sm:w-6 h-px bg-slate-200 dark:bg-slate-700/50" />

      <div 
        className={`relative z-10 flex items-center gap-3 p-3 rounded-2xl border transition-all ${
          hasChildren ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700/50' : ''
        } ${
          expanded ? 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/30 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <button className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        {!hasChildren && <div className="w-6 h-6 flex-shrink-0" />}

        <Avatar name={`${employee.firstName} ${employee.lastName}`} size="sm" />
        
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {employee.firstName} {employee.lastName}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
              {employee.designation?.name || 'No Designation'}
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {employee.department?.name || 'No Department'}
            </span>
          </div>
        </div>
        
        {hasChildren && (
          <div className="ml-auto bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{childrenNodes.length}</span>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="mt-1 relative">
          {childrenNodes.map(child => (
            <TreeNode key={child.employee._id} employee={child.employee} childrenNodes={child.children} />
          ))}
        </div>
      )}
    </div>
  )
}

export function HierarchySection() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    employeeApi.getAll({ size: 1000 })
      .then(res => setEmployees(res.data.data.content || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Build Tree
  const buildTree = (employees) => {
    const map = {}
    const roots = []

    employees.forEach(emp => {
      map[emp._id] = { employee: emp, children: [] }
    })

    employees.forEach(emp => {
      // Handle reportingManager being an object or just an ID
      const managerId = emp.reportingManager?._id || emp.reportingManager
      if (managerId && map[managerId]) {
        map[managerId].children.push(map[emp._id])
      } else {
        roots.push(map[emp._id])
      }
    })

    return roots
  }

  const tree = buildTree(employees)

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-500" />
            Organization Hierarchy
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Reporting structure and team organization</p>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No employees found in the directory.</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-x-auto">
          <div className="min-w-[600px] -ml-6 sm:-ml-8">
            {tree.map(rootNode => (
              <TreeNode key={rootNode.employee._id} employee={rootNode.employee} childrenNodes={rootNode.children} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
