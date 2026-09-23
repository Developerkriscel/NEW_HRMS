'use client'

import React from 'react'
import { X, UserCog, Mail, Phone, Briefcase, Calendar, ShieldCheck, Edit2, ShieldAlert } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { formatDate, cn } from '@/lib/utils'

export function AdminDetailsDrawer({ isOpen, onClose, admin, onEdit }) {
  if (!isOpen || !admin) return null

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'SUSPENDED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            {admin.profilePhoto ? (
              <img src={admin.profilePhoto} alt={admin.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-200/50 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl shrink-0 shadow-sm">
                {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {admin.name || 'Administrator'}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className={`px-2 py-0.5 font-bold rounded-md ${getStatusColor(admin.status)} uppercase tracking-wide`}>
                  {admin.status}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">
                  {admin.email}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { onClose(); onEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                MFA Status
              </div>
              <div className={cn("text-lg font-bold mt-auto", admin.mfaEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400")}>
                {admin.mfaEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-orange-500" />
                Created
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-auto">
                {formatDate(admin.createdAt)}
              </div>
            </div>
          </div>

          {/* Admin Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <UserCog className="w-4 h-4 text-indigo-500" />
              Identity Details
            </h3>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                
                <div className="p-4 col-span-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><UserCog className="w-3 h-3"/> Full Name</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.name || '—'}</div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">First Name</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.firstName || '—'}</div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Name</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.lastName || '—'}</div>
                </div>

                <div className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3 h-3"/> Designation</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.designation || '—'}</div>
                </div>

                <div className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Mobile Number</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.mobileNumber || '—'}</div>
                </div>

                <div className="p-4 col-span-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Mail className="w-3 h-3"/> Email Address</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{admin.email || '—'}</div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </Portal>
  )
}
