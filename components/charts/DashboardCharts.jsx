'use client'

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const VIBRANT_PIE_COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#f59e0b']

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-xl py-2 px-4 shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-700/50 text-xs backdrop-blur-md">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5">{label || payload[0]?.name}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}:</span>
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white ml-auto">
                {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const PIE_GRADIENTS = [
  { id: 'grad-blue', colors: ['#60a5fa', '#2563eb'] },
  { id: 'grad-green', colors: ['#34d399', '#059669'] },
  { id: 'grad-rose', colors: ['#fb7185', '#e11d48'] },
  { id: 'grad-sky', colors: ['#38bdf8', '#0284c7'] },
  { id: 'grad-purple', colors: ['#c084fc', '#7e22ce'] },
  { id: 'grad-amber', colors: ['#fbbf24', '#d97706'] },
]

export function DepartmentPieChart({ data }) {
  if (!data?.length) return <div className="text-slate-400">No Data</div>
  
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0)
  const mainPercentage = total > 0 ? Math.round(((data[0]?.value || 0) / total) * 100) : 0

  return (
    <div className="relative w-full h-[200px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <defs>
            {PIE_GRADIENTS.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={g.colors[0]} />
                <stop offset="100%" stopColor={g.colors[1]} />
              </linearGradient>
            ))}
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={6}
            dataKey="value"
            stroke="none"
            cornerRadius={8}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#${PIE_GRADIENTS[index % PIE_GRADIENTS.length].id})`} 
                style={{ filter: 'url(#shadow)' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            iconType="circle"
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingLeft: 20 }} 
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Number Badge */}
      <div className="absolute top-[50%] left-[30%] sm:left-[35%] -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          {mainPercentage}%
        </span>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {data[0]?.name?.split(' ')[0]}
        </span>
      </div>
    </div>
  )
}

export function GenericAreaChart({ data, xKey, dataKey, colorFrom = '#6366f1', colorTo = '#4f46e5', label }) {
  if (!data?.length) return <div className="text-slate-400">No Data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFrom} stopOpacity={0.4} />
            <stop offset="60%" stopColor={colorFrom} stopOpacity={0.05} />
            <stop offset="100%" stopColor={colorTo} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" className="dark:stroke-slate-800/80" vertical={false} />
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dy={10} 
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dx={-10} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: colorFrom, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          name={label || dataKey} 
          stroke={colorFrom} 
          strokeWidth={4} 
          fill={`url(#area-grad-${dataKey})`} 
          dot={{ r: 4, fill: '#ffffff', stroke: colorFrom, strokeWidth: 2 }}
          activeDot={{ r: 7, fill: colorFrom, stroke: '#ffffff', strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function GenericBarChart({ data, xKey, dataKey, colorFrom = '#38bdf8', colorTo = '#2563eb', label }) {
  if (!data?.length) return <div className="text-slate-400">No Data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} maxBarSize={45}>
        <defs>
          <linearGradient id={`bar-grad-1-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFrom} stopOpacity={1} />
            <stop offset="100%" stopColor={colorTo} stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id={`bar-grad-2-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
            <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" className="dark:stroke-slate-800/80" vertical={false} />
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dy={10} 
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dx={-10} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', className: 'dark:fill-slate-800/50' }} />
        <Bar 
          dataKey={dataKey} 
          name={label || dataKey} 
          fill={`url(#bar-grad-1-${dataKey})`} 
          radius={[6, 6, 0, 0]} 
        />
        {data.some(d => d.secondary != null) && (
          <Bar 
            dataKey="secondary" 
            name="Previous / Target" 
            fill={`url(#bar-grad-2-${dataKey})`} 
            radius={[6, 6, 0, 0]} 
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GenericLineChart({ data, xKey, dataKey, color = '#f43f5e', label }) {
  if (!data?.length) return <div className="text-slate-400">No Data</div>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" className="dark:stroke-slate-800/80" vertical={false} />
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dy={10} 
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
          axisLine={false} 
          tickLine={false} 
          dx={-10} 
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          name={label || dataKey} 
          stroke={color} 
          strokeWidth={4} 
          dot={{ r: 4, fill: '#ffffff', stroke: color, strokeWidth: 2 }}
          activeDot={{ r: 7, fill: color, stroke: '#ffffff', strokeWidth: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RevenueAreaChart({ data }) {
  return <GenericAreaChart data={data} xKey="month" dataKey="revenue" label="Revenue" />
}

export function AttendanceBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }} maxBarSize={30}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" className="dark:stroke-slate-800/80" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', className: 'dark:fill-slate-800/50' }} />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
        <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="leave" name="On Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GrowthLineChart({ data }) {
  return <GenericLineChart data={data} xKey="month" dataKey="growth" label="Growth %" />
}

export function Sparkline({ data, dataKey, color = '#2563eb' }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          strokeWidth={2} 
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
        <Tooltip cursor={false} contentStyle={{ display: 'none' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PayrollBarChart({ data }) {
  return <GenericBarChart data={data} xKey="month" dataKey="amount" label="Total Payroll" />
}
