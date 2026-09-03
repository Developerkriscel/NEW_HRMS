import React from 'react'
import { Calendar, CheckCircle2, Clock, MapPin, Building, Briefcase } from 'lucide-react'

export function OnboardingOverview({ record }) {
  const upcomingTasks = record.tasks.filter(t => t.status !== 'COMPLETED').slice(0, 3)
  const pendingDocs = record.documents.filter(d => d.status !== 'VERIFIED').slice(0, 3)

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Role Details</p>
              <p className="text-sm text-slate-500 mb-0.5">{record.designation}</p>
              <p className="text-xs text-slate-400">{record.employmentType} • {record.workMode}</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Placement</p>
              <p className="text-sm text-slate-500 mb-0.5">{record.department}</p>
              <p className="text-xs text-slate-400">Reports to {record.reportingManager}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Tasks
          </h3>
          {upcomingTasks.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">All tasks completed!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{task.name}</p>
                      <p className="text-xs text-slate-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                    {task.assignedTo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" /> Required Documents
          </h3>
          {pendingDocs.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">All documents verified!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500">Required Document</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    doc.status === 'NOT_SUBMITTED' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {doc.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
