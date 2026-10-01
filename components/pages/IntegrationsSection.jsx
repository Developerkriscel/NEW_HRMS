'use client'

import { Mail } from 'lucide-react'
import { MailSettingsSection } from './MailSettingsSection'

export function IntegrationsSection() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="mb-6 relative z-10">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            Email & Notification Integration
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Configure SMTP server settings to deliver operational notifications, payslips, and alert emails from NexaHR.
          </p>
        </div>

        <div className="relative z-10">
          <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-5 sm:p-6">
            <MailSettingsSection />
          </div>
        </div>
      </div>
    </div>
  )
}
