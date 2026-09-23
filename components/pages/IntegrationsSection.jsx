'use client'

import { useState } from 'react'
import { Mail, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { MailSettingsSection } from './MailSettingsSection'
import { AiIntegrationSection } from './AiIntegrationSection'

export function IntegrationsSection() {
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-3xl p-8 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="mb-6 relative z-10">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            Integrations
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Connect NexaHR with external services and AI providers.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {/* Mail Integration Card */}
          <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm transition-all duration-300">
            <button 
              onClick={() => toggleSection('mail')}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Mail Integration</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure SMTP server settings to send emails from NexaHR.</p>
                </div>
              </div>
              <div className="text-slate-400">
                {openSection === 'mail' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </div>
            </button>
            
            {openSection === 'mail' && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20">
                <MailSettingsSection />
              </div>
            )}
          </div>

          {/* AI Integration Card */}
          <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm transition-all duration-300">
            <button 
              onClick={() => toggleSection('ai')}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">AI Integration</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure your AI provider for advanced resume parsing and candidate matching.</p>
                </div>
              </div>
              <div className="text-slate-400">
                {openSection === 'ai' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </div>
            </button>
            
            {openSection === 'ai' && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20">
                <AiIntegrationSection />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
