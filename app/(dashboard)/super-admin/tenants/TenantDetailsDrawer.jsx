'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { X, Building2, Users, HardDrive, Database, Calendar, Phone, MapPin, Mail, Globe, Briefcase, Edit2 } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { formatDate, cn } from '@/lib/utils'

export function TenantDetailsDrawer({ isOpen, onClose, tenant }) {
  const router = useRouter()
  const [viewingImage, setViewingImage] = React.useState(null)

  if (!isOpen || !tenant) return null

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'TRIAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'GRACE': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'SUSPENDED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] transition-opacity animate-in fade-in" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-[160] transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            {tenant.logoUrl || tenant.logo ? (
              <img 
                src={tenant.logoUrl || tenant.logo} 
                alt={tenant.companyName} 
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setViewingImage(tenant.logoUrl || tenant.logo)}
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg shrink-0 shadow-sm">
                {tenant.companyName ? tenant.companyName.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {tenant.companyName}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className={`px-2 py-0.5 font-bold rounded-md ${getStatusColor(tenant.status)} uppercase tracking-wide`}>
                  {tenant.status}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {tenant.tenantCode} {tenant.subdomain ? `· ${tenant.subdomain}.nexahr.io` : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { onClose(); router.push(`/super-admin/tenants/${tenant._id}`); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
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
                <Users className="w-4 h-4 text-blue-500" />
                Employee Limit
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-auto">
                {tenant.employeeLimit || 250}
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <HardDrive className="w-4 h-4 text-purple-500" />
                Storage
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-auto">
                0 / 5120 MB
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <Database className="w-4 h-4 text-emerald-500" />
                Tenant Database
              </div>
              <div className="mt-auto">
                <span className="inline-flex px-3 py-1 bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg tracking-wide uppercase">
                  {tenant.provisioningStatus || 'READY'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-orange-500" />
                Created
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-auto">
                {formatDate(tenant.createdAt)}
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Company Details
            </h3>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                
                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Globe className="w-3 h-3"/> Subdomain</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.subdomain || '—'}</div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Phone</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.businessPhone || '+91 8120327857'}</div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3 h-3"/> Industry</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.industry || 'Technology'}</div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Country / State</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.country || 'India'} / {tenant.state || 'Madhya Pradesh'}</div>
                </div>

                <div className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">GST</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.gstNumber || '—'}</div>
                </div>

                <div className="p-4 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">PAN</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{tenant.panNumber || '—'}</div>
                </div>

              </div>
            </div>
          </div>

          {/* Admin Info */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-rose-500" />
              Primary Admin
            </h3>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold shrink-0">
                {tenant.adminEmail ? tenant.adminEmail.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{tenant.adminEmail || 'admin@tenant.io'}</div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Timezone: {tenant.timezone || 'Asia/Kolkata'} · Currency: {tenant.currency || 'INR'}</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative flex flex-col items-center justify-center p-2 rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/20">
            <button 
              onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
              className="fixed top-6 right-6 p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all z-[10000]"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={viewingImage} 
              alt="Preview" 
              className="w-[90vw] h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Portal>
  )
}
