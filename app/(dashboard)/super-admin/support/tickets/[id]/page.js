'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Save, Send } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { cn, formatDate } from '@/lib/utils'
import api from '@/services/api'

const STATUSES = ['OPEN', 'IN PROGRESS', 'WAITING FOR CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

function badgeClass(status) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'OPEN' || status === 'IN PROGRESS' || status === 'REOPENED') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

export default function SuperAdminSupportTicketPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        api.get(`/super-admin/support/tickets/${id}`, { devMock: false, skipCache: true }),
        api.get(`/super-admin/support/tickets/${id}/messages`, { devMock: false, skipCache: true }),
      ])
      setTicket(ticketRes.data.data)
      setMessages(messagesRes.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ticket')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  async function updateTicket(values) {
    if (!ticket) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.patch(`/super-admin/support/tickets/${id}`, values)
      setTicket((current) => ({ ...current, ...data.data }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ticket')
    } finally {
      setSaving(false)
    }
  }

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/super-admin/support/tickets/${id}/messages`, { message: reply.trim(), isInternal: internal })
      setReply('')
      setInternal(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reply')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <button type="button" onClick={() => router.push('/super-admin/support')} className="btn-secondary">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      {ticket ? (
        <>
          <section className="rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{ticket.ticketNumber}</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{ticket.subject}</h1>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {ticket.tenant?.companyName || ticket.tenant?.tenantCode || 'Unknown organization'} - {ticket.category} - {formatDate(ticket.createdAt)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Status</span>
                  <select className="input-field min-w-[190px]" value={ticket.status} onChange={(e) => updateTicket({ status: e.target.value })} disabled={saving}>
                    {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Priority</span>
                  <select className="input-field min-w-[150px]" value={ticket.priority} onChange={(e) => updateTicket({ priority: e.target.value })} disabled={saving}>
                    {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className={cn('rounded-full px-3 py-1 text-xs font-black uppercase', badgeClass(ticket.status))}>{ticket.status}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{ticket.priority}</span>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">{ticket.description}</p>
          </section>

          <section className="rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <MessageSquare className="h-5 w-5 text-indigo-500" />
              Conversation
            </h2>

            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-slate-400">No messages yet.</p>
              ) : messages.map((message) => (
                <div key={message._id} className={cn('rounded-2xl border p-4', message.isInternal ? 'border-amber-200 bg-amber-50' : message.senderRole === 'PLATFORM_ADMIN' ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-200 bg-slate-50')}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {message.isInternal ? 'Internal Note' : message.senderRole === 'PLATFORM_ADMIN' ? 'Platform Support' : 'Customer'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">{formatDate(message.createdAt)}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">{message.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={sendReply} className="mt-5 flex flex-col gap-3">
              <textarea className="input-field min-h-[110px] resize-y py-3" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply or internal note..." />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal note
                </label>
                <button type="submit" className="btn-primary" disabled={saving || !reply.trim()}>
                  {internal ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {saving ? 'Saving...' : internal ? 'Save Note' : 'Send Reply'}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  )
}
