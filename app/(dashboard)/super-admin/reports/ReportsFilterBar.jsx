'use client'

import { Calendar as CalendarIcon } from 'lucide-react'

export function ReportsFilterBar({ filters, setFilters, plans = [], companies = [] }) {
  
  const handleChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
  }

  return (
    <div className="py-2 z-10">
      <div className="flex flex-wrap items-end gap-4">
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
          <div className="relative">
            <CalendarIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="date" 
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filters.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
          <div className="relative">
            <CalendarIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="date" 
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filters.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company</label>
          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
            value={filters.tenantId}
            onChange={(e) => handleChange('tenantId', e.target.value)}
          >
            <option value="">All Companies</option>
            {Array.isArray(companies) ? companies.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>) : null}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</label>
          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
            value={filters.planId}
            onChange={(e) => handleChange('planId', e.target.value)}
          >
            <option value="">All Plans</option>
            {Array.isArray(plans) ? plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>) : null}
          </select>
        </div>

      </div>
    </div>
  )
}
