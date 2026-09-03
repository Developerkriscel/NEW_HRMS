'use client'

import { useEffect, useState, useRef } from 'react'
import { MessageSquarePlus, Plus, X, Search, Headphones, Clock, CheckCircle, AlertTriangle, MessageCircle, Send } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { helpdeskApi } from '@/services/helpdeskApi'
import { formatDate } from '@/lib/utils'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Portal } from '@/components/common/Portal'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']

const PRIORITY_COLORS = {
  LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  URGENT: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
}

export function HelpdeskWorkspace({ title, subtitle, canRaise = false, canManage = false }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ subject: '', category: '', priority: 'MEDIUM', description: '' })
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Drawer state
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [commentText, setCommentText] = useState('')
  const commentsEndRef = useRef(null)

  function load() {
    setLoading(true)
    const params = { size: 100 }
    if (statusFilter) params.status = statusFilter
    helpdeskApi.list(params)
      .then((res) => {
        setTickets(res.data.data.content || [])
        // If a ticket is currently open in the drawer, update its data
        if (selectedTicket) {
          const updated = res.data.data.content?.find(t => t._id === selectedTicket._id)
          if (updated) setSelectedTicket(updated)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom of comments when selectedTicket changes
  useEffect(() => {
    if (selectedTicket && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedTicket?.comments?.length, selectedTicket?._id])

  // KPIs
  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length
  const escalatedTickets = tickets.filter(t => t.status === 'ESCALATED').length
  const resolvedTickets = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length

  async function raiseTicket(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await helpdeskApi.raise(form)
      setForm({ subject: '', category: '', priority: 'MEDIUM', description: '' })
      setMessage('Ticket raised successfully')
      setShowForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to raise ticket')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(nextStatus) {
    if (!selectedTicket || selectedTicket.status === nextStatus) return
    setSaving(true)
    try {
      await helpdeskApi.setStatus(selectedTicket._id, nextStatus)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim() || !selectedTicket) return
    setSaving(true)
    try {
      const res = await helpdeskApi.addComment(selectedTicket._id, commentText)
      setCommentText('')
      // Update the local selected ticket immediately for snappy UI, while load() runs in background
      setSelectedTicket(res.data.data)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add comment')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Ticket', accessor: 'subject', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.subject}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{row.category || 'General'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${PRIORITY_COLORS[row.priority] || PRIORITY_COLORS.MEDIUM}`}>
              {row.priority}
            </span>
          </div>
        </div>
      </div>
    ) },
    { header: 'Raised By', accessor: 'raisedBy', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Created', accessor: 'createdAt', render: (v) => formatDate(v) },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <button 
        className="px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setSelectedTicket(row)}
      >
        View Details
      </button>
    ) },
  ]

  const kpis = [
    { label: 'Total Tickets', value: totalTickets, icon: Headphones, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Active', value: openTickets, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Escalated', value: escalatedTickets, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'Resolved', value: resolvedTickets, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ]

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {canRaise && (
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" 
              onClick={() => { setMessage(''); setShowForm(true); }}
            >
              <Plus className="w-4 h-4" /> New Ticket
            </button>
          )}
        </div>
      </div>

      {canManage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon
            return (
              <div key={idx} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{kpi.value}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">{kpi.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={tickets}
          isLoading={loading}
          searchPlaceholder="Search tickets..."
          emptyMessage="No tickets found"
        />
      </div>

      {/* Ticket Details Drawer */}
      {selectedTicket && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/35 z-[100] transition-opacity" onClick={() => setSelectedTicket(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white dark:bg-slate-900 shadow-2xl z-[101] flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
            <div className="flex-none px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ticket Details</h2>
                  <p className="text-xs text-slate-500 font-medium">#{selectedTicket._id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Core Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>{selectedTicket.status}</Badge>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${PRIORITY_COLORS[selectedTicket.priority] || PRIORITY_COLORS.MEDIUM}`}>
                      {selectedTicket.priority} Priority
                    </span>
                    {selectedTicket.category && (
                      <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {selectedTicket.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <p>Raised by: <span className="text-slate-800 dark:text-slate-200">{selectedTicket.raisedBy?.firstName} {selectedTicket.raisedBy?.lastName}</span></p>
                  <p>Created: <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedTicket.createdAt)}</span></p>
                  {selectedTicket.slaDueAt && (
                    <p>SLA Due: <span className="text-slate-800 dark:text-slate-200">{formatDate(selectedTicket.slaDueAt)}</span></p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Update Status</label>
                  <select 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer shadow-sm"
                    value={selectedTicket.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    disabled={saving}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4" /> Activity & Comments
                </h4>

                <div className="space-y-4 mb-4">
                  {selectedTicket.comments?.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">No comments yet. Start the conversation.</p>
                  ) : (
                    selectedTicket.comments?.map((c, i) => {
                      // Note: the API needs to populate c.by for names to show up. We updated the backend to do this.
                      const isOwner = c.by?._id === selectedTicket.raisedBy?._id || c.by === selectedTicket.raisedBy?._id
                      const authorName = c.by?.firstName ? `${c.by.firstName} ${c.by.lastName}` : (isOwner ? 'Employee' : 'Support')
                      
                      return (
                        <div key={i} className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-500">{authorName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(c.at).toLocaleString()}</span>
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                            isOwner 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-sm' 
                              : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 rounded-tl-sm border border-indigo-100 dark:border-indigo-500/30'
                          }`}>
                            {c.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <div className="flex-none p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  required
                  placeholder="Type a message..." 
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={saving}
                />
                <button 
                  type="submit" 
                  disabled={saving || !commentText.trim()} 
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-12 flex items-center justify-center rounded-xl transition-all shadow-[0_0_15px_-3px_rgba(79,70,229,0.4)]"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Raise Ticket Modal */}
      {canRaise && showForm && (
        <Portal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Raise a Ticket</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">We'll get back to you as soon as possible</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={raiseTicket} className="p-6">
              {message && (
                <div className="mb-5 p-3 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Subject</label>
                  <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="What do you need help with?" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Category</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="IT, HR, Payroll, etc." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Priority</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Description</label>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" rows={4} placeholder="Describe the issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2">
                  <MessageSquarePlus className="w-4 h-4" /> {saving ? 'Submitting...' : 'Raise Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}
    </div>
  )
}
