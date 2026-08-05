'use client'

import dynamic from 'next/dynamic'

function ChartFallback() {
  return <div className="h-[240px] rounded-xl bg-slate-50 dark:bg-slate-800/50 shimmer" />
}

function SparklineFallback() {
  return <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/50 shimmer" />
}

export const RevenueAreaChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.RevenueAreaChart),
  { ssr: false, loading: ChartFallback }
)

export const AttendanceBarChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.AttendanceBarChart),
  { ssr: false, loading: ChartFallback }
)

export const DepartmentPieChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.DepartmentPieChart),
  { ssr: false, loading: ChartFallback }
)

export const GrowthLineChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.GrowthLineChart),
  { ssr: false, loading: ChartFallback }
)

export const GenericAreaChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.GenericAreaChart),
  { ssr: false, loading: ChartFallback }
)

export const GenericBarChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.GenericBarChart),
  { ssr: false, loading: ChartFallback }
)

export const Sparkline = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.Sparkline),
  {
    ssr: false,
    loading: SparklineFallback,
  }
)

export const PayrollBarChart = dynamic(
  () => import('@/components/charts/DashboardCharts').then((mod) => mod.PayrollBarChart),
  { ssr: false, loading: ChartFallback }
)
