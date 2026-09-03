'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { GraduationCap, Users } from 'lucide-react'

const EmployeeTrainingWorkspace = dynamic(
  () => import('@/components/pages/EmployeeTrainingWorkspace').then((mod) => mod.EmployeeTrainingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

const TrainingWorkspace = dynamic(
  () => import('@/components/pages/TrainingWorkspace').then((mod) => mod.TrainingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerTrainingPage() {
  const [activeTab, setActiveTab] = useState('mine')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'mine'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> My Training
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'team'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Users className="w-4 h-4" /> Team Training
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'mine' ? <EmployeeTrainingWorkspace /> : <TrainingWorkspace />}
      </div>
    </div>
  )
}
