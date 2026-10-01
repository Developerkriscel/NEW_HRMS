'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
  Calendar,
  CreditCard,
  LifeBuoy,
  Laptop,
  ShieldAlert,
  Megaphone,
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { notificationApi } from '@/services/notificationApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

function formatRelativeTime(date) {
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (!Number.isFinite(value)) return 'Recently'
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const CATEGORY_CONFIG = {
  leave: { label: 'Leave', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  payroll: { label: 'Payroll', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  helpdesk: { label: 'Helpdesk', icon: LifeBuoy, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  asset: { label: 'Asset', icon: Laptop, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  security: { label: 'Security', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  announcement: { label: 'Announcement', icon: Megaphone, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  document: { label: 'Document', icon: FileText, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  system: { label: 'System', icon: Sparkles, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  general: { label: 'General', icon: Bell, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { notifications: clientNotifications, markAllRead: clientMarkAllRead, markNotificationRead: clientMarkRead } = useUIStore()

  const [serverNotifications, setServerNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'unread' | 'read'
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await notificationApi.list()
      const data = res?.data?.data
      if (data?.notifications && Array.isArray(data.notifications)) {
        setServerNotifications(data.notifications)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Merge server and client store notifications
  const allNotifications = useMemo(() => {
    const list = [...serverNotifications]
    const ids = new Set(list.map((n) => String(n.id)))
    for (const c of clientNotifications || []) {
      if (!ids.has(String(c.id))) {
        list.unshift(c)
      }
    }
    return list
  }, [serverNotifications, clientNotifications])

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.read) return false
      if (activeTab === 'read' && !n.read) return false

      // Category filter
      if (selectedCategory !== 'all' && n.category !== selectedCategory) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = n.title?.toLowerCase().includes(q)
        const matchMsg = n.message?.toLowerCase().includes(q)
        if (!matchTitle && !matchMsg) return false
      }

      return true
    })
  }, [allNotifications, activeTab, selectedCategory, searchQuery])

  const unreadCount = allNotifications.filter((n) => !n.read).length
  const readCount = allNotifications.filter((n) => n.read).length

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation()
    setServerNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
    clientMarkRead(id)
    try {
      await notificationApi.markRead(id)
    } catch {
      // non-fatal
    }
  }

  const handleMarkAllRead = async () => {
    const syntheticIds = allNotifications.map((n) => n.id)
    setServerNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    clientMarkAllRead()
    try {
      await notificationApi.markAllRead(syntheticIds)
    } catch {
      // non-fatal
    }
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    setServerNotifications((prev) => prev.filter((item) => item.id !== id))
    try {
      await notificationApi.delete(id)
    } catch {
      // non-fatal
    }
  }

  const handleItemClick = (n) => {
    if (!n.read) {
      handleMarkAsRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
    }
  }

  const categories = [
    { key: 'all', label: 'All Categories' },
    { key: 'leave', label: 'Leaves' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'helpdesk', label: 'Helpdesk' },
    { key: 'asset', label: 'Assets' },
    { key: 'security', label: 'Security' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'system', label: 'System' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-sm">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Notification Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Panel-specific updates, pending approvals, and operational alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:shadow"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Notifications
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {allNotifications.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unread Updates
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {unreadCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Reviewed / Completed
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {readCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
        {/* Tabs: All / Unread / Read */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({allNotifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'unread'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'read'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat.key
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3">
              No notifications found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matching "${searchQuery}".`
                : activeTab === 'unread'
                ? "You're all caught up! No unread notifications right now."
                : 'Your notification center is clear.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const cat = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.general
            const Icon = cat.icon

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  !n.read
                    ? 'bg-blue-50/20 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon */}
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {cat.label}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {formatRelativeTime(n.time)}
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base mt-1 ${
                        !n.read
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'font-semibold text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {n.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div>
                        {n.link && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                            Open related page
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="p-1.5 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(n.id, e)}
                          className="p-1.5 text-xs text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Dismiss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
