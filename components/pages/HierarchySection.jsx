'use client'

import { useEffect, useState } from 'react'
import { employeeApi } from '@/services/employeeApi'
import { Avatar } from '@/components/common/Avatar'
import { ChevronDown, ChevronRight, Users, Network, Building2, Briefcase, UserCircle2, ShieldCheck } from 'lucide-react'

function TreeNode({ employee, childrenNodes, defaultExpanded = true, level = 0 }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = childrenNodes && childrenNodes.length > 0

  // Formatting role/designation
  const roleName = employee.designation?.name || (employee.role ? employee.role.replace('_', ' ') : 'Unassigned Role')
  const departmentName = employee.department?.name || 'No Department'

  // Visual cues based on level
  const isRoot = level === 0
  const isManager = level === 1

  return (
    <div className="relative pt-2">
      <div 
        className={`relative z-10 flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
          hasChildren ? 'cursor-pointer hover:border-indigo-400 hover:shadow-md' : ''
        } ${
          isRoot 
            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-indigo-200 dark:border-indigo-800 shadow-sm'
            : isManager
              ? 'bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/40 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Toggle Button */}
        <div className="flex-shrink-0 flex items-center">
          {hasChildren ? (
            <button 
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                expanded 
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' 
                  : 'bg-slate-200 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400'
              }`}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-7 h-7" /> /* Spacer */
          )}
        </div>

        <Avatar name={`${employee.firstName} ${employee.lastName}`} size={isRoot ? "lg" : "md"} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-black truncate ${isRoot ? 'text-lg text-slate-900 dark:text-white' : 'text-base text-slate-800 dark:text-slate-100'}`}>
              {employee.firstName} {employee.lastName}
            </h3>
            {employee.employeeCode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {employee.employeeCode}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {isRoot ? <ShieldCheck className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
              <span className="capitalize">{roleName}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>{departmentName}</span>
            </div>
          </div>
        </div>
        
        {hasChildren && (
          <div className={`flex-shrink-0 ml-4 px-3 py-1.5 rounded-xl flex items-center gap-2 ${
            isRoot ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'
          }`}>
            <Users className="w-4 h-4 text-indigo-500" />
            <div className="text-xs">
              <span className="font-black text-slate-700 dark:text-slate-200">{childrenNodes.length}</span>
              <span className="text-slate-500 ml-1 font-medium hidden sm:inline">Reports</span>
            </div>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="relative ml-8 sm:ml-12 mt-2">
          {/* Main vertical line for children */}
          <div className="absolute left-0 top-0 bottom-6 w-px bg-indigo-200 dark:bg-indigo-800/50" />
          
          <div className="flex flex-col space-y-2">
            {childrenNodes.map((child, idx) => (
              <div key={child.employee._id} className="relative pl-8 sm:pl-10">
                {/* Horizontal branch line pointing to this child */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 sm:w-10 h-px bg-indigo-200 dark:bg-indigo-800/50" />
                <TreeNode level={level + 1} employee={child.employee} childrenNodes={child.children} />
              </div>
            ))}
          </div>
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
      <div className="flex justify-center items-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
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
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-indigo-600 dark:from-white dark:to-indigo-300 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
              <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Organization Hierarchy
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium max-w-2xl">
            Detailed reporting structure showing team organization, roles, and management levels.
          </p>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <UserCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No employees found</h3>
          <p className="text-slate-500 text-sm">Add employees to the directory to build your organization chart.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-x-auto">
          <div className="min-w-[600px] flex flex-col gap-8">
            {tree.map(rootNode => (
              <TreeNode key={rootNode.employee._id} employee={rootNode.employee} childrenNodes={rootNode.children} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
