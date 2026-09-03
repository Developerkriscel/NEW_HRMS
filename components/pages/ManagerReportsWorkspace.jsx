'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { managerApi } from '@/services/managerApi'
import { formatDate } from '@/lib/utils'
import { 
  BarChart3, 
  FileText, 
  CalendarDays, 
  Clock, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Filter 
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance', icon: Users },
  { id: 'late', label: 'Late Marks', icon: Clock },
  { id: 'absence', label: 'Absences', icon: AlertCircle },
  { id: 'overtime', label: 'Overtime', icon: TrendingUp },
  { id: 'leave', label: 'Leaves', icon: CalendarDays },
  { id: 'kra', label: 'KRA Status', icon: BarChart3 },
  { id: 'delay', label: 'Delayed Tasks', icon: AlertCircle },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'pending', label: 'Pending Approvals', icon: Clock }
]

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9']

function labelFor(key) {
  return key.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function ManagerReportsWorkspace() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  
  const [type, setType] = useState('attendance')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    managerApi.getReports({ type, from, to })
      .then((res) => setRows(res.data?.data?.rows || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [type, from, to])

  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key))
    return set
  }, new Set(['employee'])))

  const columns = keys.map((key) => ({
    header: labelFor(key),
    accessor: key,
    render: (value) => {
      if (value == null || value === '') return '-'
      if (key.toLowerCase().includes('date') || key === 'checkIn' || key === 'checkOut' || key === 'createdAt') {
        return formatDate(value, key === 'checkIn' || key === 'checkOut' ? 'dd MMM yyyy HH:mm' : 'dd MMM yyyy')
      }
      if (typeof value === 'boolean') {
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-bold ${value ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
            {value ? 'Yes' : 'No'}
          </span>
        )
      }
      
      // Status Badges
      if (key === 'status') {
        const str = String(value).toUpperCase()
        let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        if (str === 'APPROVED' || str === 'COMPLETED' || str === 'PRESENT') colorClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        if (str === 'PENDING' || str === 'IN_PROGRESS' || str === 'SUBMITTED') colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        if (str === 'REJECTED' || str === 'ABSENT' || str === 'DELAYED') colorClass = 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
        
        return <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${colorClass}`}>{str}</span>
      }
      
      return String(value)
    },
  }))

  // Derived Metrics & Charts
  const metrics = useMemo(() => {
    if (!rows.length) return { cards: [], chartData: [] }
    
    let cards = []
    let chartData = []

    if (['attendance', 'late', 'absence', 'overtime'].includes(type)) {
      const totalRecords = rows.length
      const lateCount = rows.filter(r => r.lateMark).length
      const absentCount = rows.filter(r => r.status === 'ABSENT').length
      
      cards = [
        { label: 'Total Records', value: totalRecords, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        { label: 'Late Marks', value: lateCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        { label: 'Absences', value: absentCount, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
      ]

      // Chart: Status Distribution
      const statusCounts = rows.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1
        return acc
      }, {})
      chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    } 
    else if (type === 'leave') {
      const pending = rows.filter(r => r.status === 'PENDING').length
      const approved = rows.filter(r => r.status === 'APPROVED').length
      const rejected = rows.filter(r => r.status === 'REJECTED').length
      
      cards = [
        { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        { label: 'Approved', value: approved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Rejected', value: rejected, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
      ]
      
      // Chart: Leave Type Distribution
      const typeCounts = rows.reduce((acc, r) => {
        const t = r.leaveType || 'Other'
        acc[t] = (acc[t] || 0) + 1
        return acc
      }, {})
      chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }))
    }
    else if (type === 'kra' || type === 'delay') {
      const avgProgress = Math.round(rows.reduce((sum, r) => sum + (r.progressPercent || 0), 0) / rows.length) || 0
      const delayed = rows.filter(r => r.delayDays > 0).length
      
      cards = [
        { label: 'Total KRAs', value: rows.length, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Delayed', value: delayed, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
      ]
      
      chartData = rows.map(r => ({
        name: r.employee?.split(' ')[0] || 'Unknown',
        progress: r.progressPercent || 0
      })).slice(0, 15) // top 15 for bar chart readability
    }
    else if (type === 'pending') {
      const expenses = rows.filter(r => r.type === 'EXPENSE').length
      const assets = rows.filter(r => r.type === 'ASSET_REQUEST').length
      const others = rows.length - expenses - assets
      
      cards = [
        { label: 'Expenses', value: expenses, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Assets', value: assets, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        { label: 'Other', value: others, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      ]
      
      const typeCounts = rows.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
      }, {})
      chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }))
    }
    
    return { cards, chartData }
  }, [rows, type])

  // Determine Chart Component based on type
  const renderChart = () => {
    if (!metrics.chartData.length) return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <BarChart3 className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">Not enough data to visualize</p>
      </div>
    )

    if (type === 'kra' || type === 'delay') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
            />
            <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    // Default Pie Chart for distributions (Attendance Status, Leave Types, Pending Types)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={metrics.chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {metrics.chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            Team Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Analyze your team's attendance, leave, performance, and operational metrics.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 w-full md:w-auto shrink-0 px-2">
          <Filter className="w-4 h-4 text-indigo-500" /> Filters
        </div>
        
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <select 
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
              value={type} 
              onChange={(e) => setType(e.target.value)}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-slate-400">From</span>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
              value={from} 
              onChange={(e) => setFrom(e.target.value)} 
            />
          </div>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-slate-400">To</span>
            <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
              value={to} 
              onChange={(e) => setTo(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Metrics & Chart Row */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* KPI Cards */}
          <div className="flex flex-col gap-4">
            {metrics.cards.map((card, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>

          {/* Chart Container */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Data Visualization
              </h3>
            </div>
            <div className="flex-1 min-h-[200px]">
              {renderChart()}
            </div>
            
            {/* Chart Legend (For Pie Charts) */}
            {metrics.chartData.length > 0 && type !== 'kra' && type !== 'delay' && (
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                {metrics.chartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Detailed Records
          </h3>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-2.5 py-1 rounded-full">
            {rows.length} rows
          </span>
        </div>
        <div className="p-4">
          <DataTable 
            columns={columns} 
            data={rows} 
            isLoading={loading} 
            searchPlaceholder="Search within records..." 
            emptyMessage={
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-slate-900 dark:text-white font-bold mb-1">No Records Found</p>
                <p className="text-slate-500 text-sm">Adjust your date range or report type to find data.</p>
              </div>
            } 
          />
        </div>
      </div>
    </div>
  )
}
