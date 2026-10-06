'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { cn, formatDate } from '@/lib/utils'

function badgeClass(status) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'OPEN' || status === 'IN PROGRESS') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

export default function CompanySupportTicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/company/support/tickets/${id}`, { credentials: 'include' }),
        fetch(`/api/company/support/tickets/${id}/messages`, { credentials: 'include' }),
      ])
      const ticketData = await ticketRes.json().catch(() => ({}))
      const messagesData = await messagesRes.json().catch(() => ({}))
      if (!ticketRes.ok) throw new Error(ticketData.message || 'Ticket not found')
      if (!messagesRes.ok) throw new Error(messagesData.message || 'Unable to load messages')
      setTicket(ticketData.data)
      setMessages(messagesData.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load ticket')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  async function sendReply(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/company/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: reply.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Failed to send reply')
      setReply('')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to send reply')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <button type="button" onClick={() => router.push('/company/support')} className="btn-secondary">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      {ticket ? (
        <>
          <section className="rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{ticket.ticketNumber}</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{ticket.subject}</h1>
                <p className="mt-2 text-sm font-semibold text-slate-500">{ticket.category} - {formatDate(ticket.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <span className={cn('rounded-full px-3 py-1 text-xs font-black uppercase', badgeClass(ticket.status))}>{ticket.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{ticket.priority}</span>
              </div>
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
                <div key={message._id} className={cn('rounded-2xl border p-4', message.senderRole === 'COMPANY_ADMIN' ? 'border-blue-100 bg-blue-50/60' : 'border-slate-200 bg-slate-50')}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">{message.senderRole === 'COMPANY_ADMIN' ? 'You' : 'Platform Support'}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{formatDate(message.createdAt)}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">{message.message}</p>
                </div>
              ))}
            </div>

            {!['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
              <form onSubmit={sendReply} className="mt-5 flex flex-col gap-3">
                <textarea className="input-field min-h-[110px] resize-y py-3" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply..." />
                <button type="submit" className="btn-primary self-end" disabled={saving || !reply.trim()}>
                  <Send className="h-4 w-4" />
                  {saving ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
