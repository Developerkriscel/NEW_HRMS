'use client'

import { useState } from 'react'
import SubscriptionsTab from './SubscriptionsTab'
import PlansTab from './PlansTab'
import { cn } from '@/lib/utils'
import { Layers, CreditCard } from 'lucide-react'

export default function SubscriptionsAndPlansPage() {
  const [activeTab, setActiveTab] = useState('subscriptions')

  return (
    <div className="animate-fade-in space-y-2 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-transparent after:rounded-full">Plans & Subscriptions</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800/60">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'subscriptions' 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          )}
        >
          <CreditCard className="w-4 h-4" /> Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'plans' 
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          )}
        >
          <Layers className="w-4 h-4" /> Plans
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'plans' && <PlansTab />}
      </div>
    </div>
  )
}
