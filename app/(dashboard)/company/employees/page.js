'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { RolesPermissionsSection } from '@/components/pages/RolesPermissionsSection'
import { HierarchySection } from '@/components/pages/HierarchySection'
import { Users, ShieldCheck, Network } from 'lucide-react'

const EmployeesList = dynamic(
  () => import('@/components/pages/EmployeesList').then((mod) => mod.EmployeesList),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function CompanyEmployeesPage() {
  const [activeTab, setActiveTab] = useState('directory')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your organization's workforce and access</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'directory'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Directory
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'hierarchy'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Network className="w-4 h-4" />
            Hierarchy
          </button>
        </nav>
      </div>

      <div className="pt-2">
        {activeTab === 'directory' ? (
          <EmployeesList basePath="/company/employees" hideHeader={true} />
        ) : activeTab === 'roles' ? (
          <RolesPermissionsSection />
        ) : (
          <HierarchySection />
        )}
      </div>
    </div>
  )
}
