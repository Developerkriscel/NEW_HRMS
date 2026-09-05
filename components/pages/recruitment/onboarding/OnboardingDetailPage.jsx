'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, ListTodo, FileText, Settings, Activity, Building, Briefcase, Mail, Phone, Calendar, Clock, CheckCircle2, ChevronRight, PauseCircle, AlertTriangle } from 'lucide-react'
import { OnboardingStatusBadge } from './components/OnboardingStatusBadge'
import { ConvertToEmployeeModal } from './components/ConvertToEmployeeModal'
import { OnboardingOverview } from './tabs/OnboardingOverview'
import { OnboardingEmployeeDetails } from './tabs/OnboardingEmployeeDetails'
import { OnboardingTasks } from './tabs/OnboardingTasks'
import { OnboardingDocuments } from './tabs/OnboardingDocuments'
import { OnboardingJoiningDetails } from './tabs/OnboardingJoiningDetails'
import { OnboardingActivity } from './tabs/OnboardingActivity'
import { preboardingApi } from '@/services/preboardingApi'
import { adaptPreboardingRecord } from './onboardingRecordAdapter'

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'employee_details', label: 'Employee Details', icon: Briefcase },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'joining', label: 'Joining & Config', icon: Settings },
  { id: 'activity', label: 'Activity', icon: Activity }
]

export function OnboardingDetailPage({ id }) {
  const router = useRouter()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await preboardingApi.get(id)
      setRecord(adaptPreboardingRecord(res.data?.data))
    } catch (err) {
      setError(err.response?.data?.message || 'Record not found')
      setRecord(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  if (loading) {
    return <div className="p-12 text-center text-sm font-semibold text-slate-500">Loading onboarding profile from database...</div>
  }

  if (!record) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{error || 'Record Not Found'}</h2>
        <button onClick={() => router.push('/hr/onboarding')} className="mt-4 text-blue-600 hover:underline">Back to Dashboard</button>
      </div>
    )
  }

  // Calculate readiness to convert
  const requiredTasks = record.tasks.filter(t => t.required)
  const requiredDocs = record.documents.filter(d => d.required)
  
  const pendingTasks = requiredTasks.filter(t => t.status !== 'COMPLETED').length
  const pendingDocs = requiredDocs.filter(d => d.status !== 'VERIFIED').length
  const totalPending = pendingTasks + pendingDocs
  
  const canConvert = totalPending === 0 && record.status !== 'COMPLETED' && record.status !== 'CANCELLED'

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/hr/onboarding')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Onboarding</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 dark:text-slate-200">{record.candidate.name}</span>
        </div>
      </div>

      {/* Hero Profile Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-3xl shadow-inner shrink-0">
            {record.candidate.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">{record.candidate.name}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {record.position}</span>
              <span className="hidden md:block w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
              <span className="flex items-center gap-1.5"><Building className="w-4 h-4" /> {record.department}</span>
              <span className="hidden md:block w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joining: {new Date(record.joiningDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
          <OnboardingStatusBadge status={record.status} className="!text-xs !px-3 !py-1.5" />
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="btn-secondary flex-1 md:flex-none justify-center">
              <PauseCircle className="w-4 h-4" /> Hold
            </button>
            <div className="relative group flex-1 md:flex-none">
              <button 
                disabled={!canConvert} 
                onClick={() => setIsConvertModalOpen(true)}
                className={`${canConvert ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 border-emerald-500 hover:shadow-lg' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 cursor-not-allowed'} font-medium px-5 py-2.5 rounded-xl border flex items-center gap-2 justify-center w-full transition-all duration-300`}
              >
                <CheckCircle2 className="w-4 h-4" /> Convert to Employee
              </button>
              
              {!canConvert && record.status !== 'COMPLETED' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900 text-white text-xs rounded-xl py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-xl">
                  {totalPending} mandatory items pending (Tasks/Docs)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Content Area */}
        <div className="w-full lg:flex-1 min-w-0 space-y-6">
          
          {/* Tabs Navigation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm overflow-x-auto hide-scrollbar flex">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
            {activeTab === 'overview' && <OnboardingOverview record={record} />}
            {activeTab === 'employee_details' && <OnboardingEmployeeDetails record={record} />}
            {activeTab === 'tasks' && <OnboardingTasks record={record} onRefresh={loadRecord} />}
            {activeTab === 'documents' && <OnboardingDocuments record={record} onRefresh={loadRecord} />}
            {activeTab === 'joining' && <OnboardingJoiningDetails record={record} onRefresh={loadRecord} />}
            {activeTab === 'activity' && <OnboardingActivity record={record} />}
          </div>
        </div>

        {/* Right Sidebar - Progress Hero */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
          <div className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900 border border-blue-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Onboarding Progress</h3>
            
            <div className="flex items-center justify-center mb-8 relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  fill="transparent" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  strokeDasharray="351.858" 
                  strokeDashoffset={351.858 - (351.858 * record.progress) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${record.progress === 100 ? 'text-emerald-500' : 'text-blue-500'}`} 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{record.progress}%</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center"><ListTodo className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tasks</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {record.tasks.filter(t => t.status === 'COMPLETED').length} / {record.tasks.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Documents</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {record.documents.filter(d => d.status === 'VERIFIED').length} / {record.documents.length}
                </span>
              </div>
            </div>
            
            {totalPending > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 flex items-start gap-3 text-amber-800 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p><strong>{totalPending} mandatory items pending.</strong> Must be completed to enable Employee Conversion.</p>
              </div>
            )}
            
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Contact Info</h3>
            <div className="space-y-4">
              <a href={`mailto:${record.candidate.email}`} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Mail className="w-4 h-4" /></div>
                {record.candidate.email}
              </a>
              <a href={`tel:${record.candidate.phone}`} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Phone className="w-4 h-4" /></div>
                {record.candidate.phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      <ConvertToEmployeeModal isOpen={isConvertModalOpen} onClose={() => {
        setIsConvertModalOpen(false)
        loadRecord()
      }} record={record} />
    </div>
  )
}
