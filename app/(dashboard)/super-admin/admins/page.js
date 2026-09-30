'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminModal } from './AdminModal'
import { AdminDetailsDrawer } from './AdminDetailsDrawer'
import { KeyRound, CheckCircle2, XCircle, Edit2, ShieldAlert, X, Activity, MoreVertical, Lock, Mail, Smartphone } from 'lucide-react'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { Portal } from '@/components/common/Portal'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// Since there's no pre-existing tenantApi endpoint for operators, we make direct fetch calls
const fetchAdmins = async () => {
  const res = await fetch('/api/super-admin/admins')
  if (!res.ok) throw new Error('Failed to fetch admins')
  return res.json()
}

const updateAdmin = async (id, data) => {
  const res = await fetch(`/api/super-admin/admins/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Failed to update admin')
  }
  return res.json()
}

export default function AdminsPage() {
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('edit')
  const [editAdminId, setEditAdminId] = useState(null)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [viewingImage, setViewingImage] = useState(null)

  async function load() {
    setLoading(true)
    setForbidden(false)
    try {
      const res = await fetchAdmins()
      setAdmins(res.data)
    } catch (err) {
      if (err.message.includes('403') || err.message.includes('Forbidden')) setForbidden(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (forbidden) return <PermissionDenied requiredPermission="operator.view" message="You don't have permission to view admins." />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800/60 pb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-transparent after:rounded-full">Company Admins</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Manage company administrators</p>
        </div>
        {hasPermission('operator.update') && (
          <button 
            onClick={() => { setEditAdminId(null); setModalMode('edit'); setModalOpen(true); }}
            className="btn-primary"
          >
            Add Admin
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><p className="text-slate-400 text-sm font-semibold">Loading admins...</p></div>
      ) : (
        <div className="relative bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200/60 dark:border-slate-800/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800/80 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="pb-4 px-2">Admin Profile</th>
                  <th className="pb-4 px-2">Company</th>
                  <th className="pb-4 px-2">Contact Info</th>
                  <th className="pb-4 px-2">Status</th>
                  <th className="pb-4 px-2">Security</th>
                  <th className="pb-4 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center text-sm font-semibold text-slate-400">
                      No admins found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr 
                      key={admin._id} 
                      className="group cursor-default hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-200"
                    >
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3.5">
                          {admin.profilePhotoUrl ? (
                            <img 
                              src={admin.profilePhotoUrl} 
                              alt={admin.name || admin.firstName} 
                              className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => setViewingImage(admin.profilePhotoUrl)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-800/20 border border-indigo-200/60 dark:border-indigo-700/50 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                                {(admin.name || (admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.firstName || admin.lastName || 'Admin')).split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {admin.name || (admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.firstName || admin.lastName || 'Admin')}
                            </p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              {admin.designation || 'Admin'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{admin.companyName}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{admin.tenantCode}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {admin.email}
                          </div>
                          {admin.mobileNumber ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                              {admin.mobileNumber}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400/50 dark:text-slate-600">
                              <Smartphone className="w-3.5 h-3.5 opacity-50" />
                              Not provided
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                          admin.status === 'ACTIVE'
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50" 
                            : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50"
                        )}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                          <span className={cn(
                            admin.mfaEnabled ? "text-emerald-600 dark:text-emerald-400" : ""
                          )}>
                            {admin.mfaEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedAdmin(admin)}
                            className="inline-flex items-center px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                          >
                            View
                          </button>
                          {hasPermission('operator.update') && (
                            <button 
                              onClick={() => { setEditAdminId(admin._id); setModalMode('edit'); setModalOpen(true); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminModal 
        open={modalOpen} 
        mode={modalMode}
        onClose={() => setModalOpen(false)} 
        adminId={editAdminId} 
        tenantId={editAdminId ? admins.find(a => a._id === editAdminId)?.tenantId : null} 
        onSuccess={() => { setModalOpen(false); load(); }} 
      />

      <AdminDetailsDrawer 
        isOpen={!!selectedAdmin}
        onClose={() => setSelectedAdmin(null)}
        admin={selectedAdmin}
        onEdit={() => {
          if (selectedAdmin) {
            setEditAdminId(selectedAdmin._id);
            setModalMode('edit');
            setModalOpen(true);
            setSelectedAdmin(null);
          }
        }}
      />

      {/* Image Viewer Modal */}
      {viewingImage && (
        <Portal>
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
        </Portal>
      )}
    </div>
  )
}
