'use client'

import { useState, useEffect } from 'react'
import { reportsApi } from '@/services/reportsApi'
import { tenantApi } from '@/services/tenantApi'
import { ReportsFilterBar } from './ReportsFilterBar'
import { KPICards } from './KPICards'
import { RevenueTrendChart } from './RevenueTrendChart'
import { RevenueByCompany } from './RevenueByCompany'
import { RevenueByPlan } from './RevenueByPlan'
import { TransactionsReport } from './TransactionsReport'

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    tenantId: '',
    planId: ''
  })
  
  const [plans, setPlans] = useState([])
  const [companies, setCompanies] = useState([])
  
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  
  const [trend, setTrend] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  
  const [byCompany, setByCompany] = useState(null)
  const [byCompanyLoading, setByCompanyLoading] = useState(true)
  
  const [byPlan, setByPlan] = useState(null)
  const [byPlanLoading, setByPlanLoading] = useState(true)
  
  const [txData, setTxData] = useState([])
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(0)
  const [txLoading, setTxLoading] = useState(true)

  // Load lookup data
  useEffect(() => {
    tenantApi.getPlans().then(res => setPlans(res.data.data || [])).catch(() => setPlans([]))
    tenantApi.getAll({ size: 1000 }).then(res => setCompanies(res.data.data?.content || [])).catch(() => setCompanies([]))
  }, [])

  // Load reports based on filters
  useEffect(() => {
    setOverviewLoading(true)
    reportsApi.getOverview(filters).then(res => {
      setOverview(res.data.data)
    }).catch(() => {
      setOverview(null)
    }).finally(() => setOverviewLoading(false))

    setTrendLoading(true)
    reportsApi.getRevenueTrend(filters).then(res => {
      setTrend(res.data.data)
    }).catch(() => {
      setTrend([])
    }).finally(() => setTrendLoading(false))

    setByCompanyLoading(true)
    reportsApi.getRevenueByCompany(filters).then(res => {
      setByCompany(res.data.data)
    }).catch(() => {
      setByCompany([])
    }).finally(() => setByCompanyLoading(false))

    setByPlanLoading(true)
    reportsApi.getRevenueByPlan(filters).then(res => {
      setByPlan(res.data.data)
    }).catch(() => {
      setByPlan([])
    }).finally(() => setByPlanLoading(false))

  }, [filters])

  // Load transactions separately to handle pagination
  useEffect(() => {
    setTxLoading(true)
    reportsApi.getPayments({ ...filters, page: txPage, limit: 10 }).then(res => {
      setTxData(res.data.data.data)
      setTxTotal(res.data.data.total)
    }).catch(() => {
      setTxData([])
      setTxTotal(0)
    }).finally(() => setTxLoading(false))
  }, [filters, txPage])

  return (
    <div className="animate-fade-in pb-12">
      <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-transparent after:rounded-full">Reports</h1>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-0">
        <KPICards data={overview} loading={overviewLoading} />
      </div>

      <div className="px-6 mt-1">
        <ReportsFilterBar 
          filters={filters} 
          setFilters={(f) => { setFilters(f); setTxPage(0); }} 
          plans={plans} 
          companies={companies} 
        />
      </div>

      <div className="p-6 pt-6 space-y-6 overflow-y-auto pb-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueTrendChart data={trend} loading={trendLoading} />
          <RevenueByCompany data={byCompany} loading={byCompanyLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RevenueByPlan data={byPlan} loading={byPlanLoading} />
          <div className="col-span-2">
            <TransactionsReport 
              data={txData} 
              loading={txLoading} 
              total={txTotal} 
              page={txPage} 
              limit={10} 
              setPage={setTxPage} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
