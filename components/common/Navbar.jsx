'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Moon, Sun, Menu, Search, LogOut, Settings, User, ChevronDown, ChevronRight, HelpCircle, CheckCheck, ExternalLink, Building2, Shield, CalendarDays, Briefcase, LayoutGrid } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Avatar } from '@/components/common/Avatar'
import { ROLE_PANEL_LABELS } from '@/lib/roleDashboards'
import { MODULE_ACCESS, filterByModuleAccess } from '@/lib/moduleAccess'
import { notificationApi } from '@/services/notificationApi'
import { interviewApi } from '@/services/interviewApi'

const PROFILE_PATH_BY_ROLE = {
  SUPER_ADMIN: '/super-admin/settings',
  COMPANY_ADMIN: '/company/settings',
  HR_MANAGER: '/hr/profile',
  FINANCE: '/hr/profile',
  IT_ADMIN: '/hr/profile',
  EMPLOYEE: '/employee/profile',
}

const SEARCH_NAV_BY_ROLE = {
  SUPER_ADMIN: [
    { title: 'Dashboard', description: 'Platform overview', path: '/super-admin/dashboard', type: 'Page' },
    { title: 'Companies', description: 'Manage companies', path: '/super-admin/tenants', type: 'Page' },
    { title: 'Plans', description: 'Subscription plans', path: '/super-admin/plans', type: 'Page' },
    { title: 'Subscriptions', description: 'Tenant subscriptions', path: '/super-admin/subscriptions', type: 'Page' },
    { title: 'Billing', description: 'Revenue overview', path: '/super-admin/billing', type: 'Page' },
    { title: 'Audit Logs', description: 'Cross-tenant activity', path: '/super-admin/audit-logs', type: 'Page' },
    { title: 'Settings', description: 'Account settings', path: '/super-admin/settings', type: 'Page' },
  ],
  COMPANY_ADMIN: [
    { title: 'Dashboard', description: 'Company overview', path: '/company/dashboard', type: 'Page' },
    { title: 'Employees', description: 'Employee directory', path: '/company/employees', type: 'Page', moduleKey: MODULE_ACCESS.EMPLOYEES },
    { title: 'Shifts', description: 'Company shifts', path: '/company/shifts', type: 'Page', moduleKey: MODULE_ACCESS.SHIFTS },
    { title: 'Attendance', description: 'Attendance records', path: '/hr/attendance', type: 'Page', moduleKey: MODULE_ACCESS.ATTENDANCE },
    { title: 'Leave', description: 'Leave requests and approvals', path: '/hr/leave', type: 'Page', moduleKey: MODULE_ACCESS.LEAVE },
    { title: 'Payroll', description: 'Payroll runs', path: '/hr/payroll', type: 'Page', moduleKey: MODULE_ACCESS.PAYROLL },
    { title: 'Recruitment', description: 'Hiring pipeline and candidates', path: '/hr/recruitment', type: 'Page', moduleKey: MODULE_ACCESS.RECRUITMENT },
    { title: 'Onboarding', description: 'Employee onboarding', path: '/hr/onboarding', type: 'Page', moduleKey: MODULE_ACCESS.ONBOARDING },
    { title: 'Offboarding', description: 'Employee exits and resignations', path: '/hr/offboarding', type: 'Page', moduleKey: MODULE_ACCESS.OFFBOARDING },
    { title: 'Assets', description: 'Asset requests and allocations', path: '/hr/assets', type: 'Page', moduleKey: MODULE_ACCESS.ASSETS },
    { title: 'Documents', description: 'Employee document records', path: '/hr/documents', type: 'Page', moduleKey: MODULE_ACCESS.DOCUMENTS },
    { title: 'Helpdesk', description: 'Employee support tickets', path: '/hr/helpdesk', type: 'Page', moduleKey: MODULE_ACCESS.HELPDESK },
    { title: 'Training', description: 'Learning sessions and assignments', path: '/hr/training', type: 'Page', moduleKey: MODULE_ACCESS.TRAINING },
    { title: 'Reports', description: 'Company reports', path: '/company/reports', type: 'Page', moduleKey: MODULE_ACCESS.REPORTS },
    { title: 'Audit Logs', description: 'Company activity logs', path: '/company/audit-logs', type: 'Page', moduleKey: MODULE_ACCESS.AUDIT_LOGS },
    { title: 'Settings', description: 'Company settings', path: '/company/settings', type: 'Page', moduleKey: MODULE_ACCESS.SETTINGS },
  ],
  HR_MANAGER: [
    { title: 'Dashboard', description: 'HR overview', path: '/hr/dashboard', type: 'Page' },
    { title: 'Employees', description: 'Employee directory', path: '/hr/employees', type: 'Page', moduleKey: MODULE_ACCESS.EMPLOYEES },
    { title: 'Attendance', description: 'Attendance records', path: '/hr/attendance', type: 'Page', moduleKey: MODULE_ACCESS.ATTENDANCE },
    { title: 'Leave', description: 'Leave requests', path: '/hr/leave', type: 'Page', moduleKey: MODULE_ACCESS.LEAVE },
    { title: 'Payroll', description: 'Payroll runs', path: '/hr/payroll', type: 'Page', moduleKey: MODULE_ACCESS.PAYROLL },
    { title: 'Recruitment', description: 'Hiring pipeline and candidates', path: '/hr/recruitment', type: 'Page', moduleKey: MODULE_ACCESS.RECRUITMENT },
    { title: 'Onboarding', description: 'Employee onboarding', path: '/hr/onboarding', type: 'Page', moduleKey: MODULE_ACCESS.ONBOARDING },
    { title: 'Profile', description: 'My profile', path: '/hr/profile', type: 'Page' },
  ],
  FINANCE: [
    { title: 'Payroll', description: 'Payroll runs', path: '/hr/payroll', type: 'Page', moduleKey: MODULE_ACCESS.PAYROLL },
    { title: 'Reports', description: 'Payroll reports', path: '/hr/reports', type: 'Page', moduleKey: MODULE_ACCESS.REPORTS },
    { title: 'Profile', description: 'My profile', path: '/hr/profile', type: 'Page' },
  ],
  IT_ADMIN: [
    { title: 'Helpdesk', description: 'Employee tickets', path: '/hr/helpdesk', type: 'Page', moduleKey: MODULE_ACCESS.HELPDESK },
    { title: 'Assets', description: 'Asset tracking', path: '/hr/assets', type: 'Page', moduleKey: MODULE_ACCESS.ASSETS },
    { title: 'Profile', description: 'My profile', path: '/hr/profile', type: 'Page' },
  ],
  MANAGER: [
    { title: 'Dashboard', description: 'Manager overview', path: '/manager/dashboard', type: 'Page' },
    { title: 'My Team', description: 'Team members', path: '/manager/team', type: 'Page' },
    { title: 'Approvals', description: 'Pending team approvals', path: '/manager/leave-approvals', type: 'Page' },
    { title: 'Attendance', description: 'Team attendance', path: '/manager/attendance', type: 'Page' },
    { title: 'Tasks', description: 'Assign and track team work', path: '/manager/tasks', type: 'Page' },

    { title: 'Reports', description: 'Team reports', path: '/manager/reports', type: 'Page' },
  ],
  EMPLOYEE: [
    { title: 'My Dashboard', description: 'Employee overview', path: '/employee/dashboard', type: 'Page' },
    { title: 'Attendance', description: 'My attendance', path: '/employee/attendance', type: 'Page' },
    { title: 'Leave', description: 'My leave requests', path: '/employee/leave', type: 'Page' },
    { title: 'Tasks', description: 'Assigned tasks', path: '/employee/tasks', type: 'Page' },

    { title: 'Payslips', description: 'Salary slips', path: '/employee/payslips', type: 'Page' },
    { title: 'Expenses', description: 'Expense claims', path: '/employee/expenses', type: 'Page' },

    { title: 'Documents', description: 'My documents', path: '/employee/documents', type: 'Page' },
    { title: 'Assets', description: 'My assigned assets', path: '/employee/assets', type: 'Page' },
    { title: 'Helpdesk', description: 'Support tickets', path: '/employee/helpdesk', type: 'Page' },
    { title: 'Training', description: 'Assigned learning', path: '/employee/training', type: 'Page' },
    { title: 'Offboarding', description: 'Resignation workflow', path: '/employee/offboarding', type: 'Page' },
    { title: 'Profile', description: 'My profile', path: '/employee/profile', type: 'Page' },
  ],
}

const searchableText = (item) => `${item.title} ${item.description || ''} ${item.type || ''}`.toLowerCase()

function formatRelativeTime(date) {
  const value = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (!Number.isFinite(value)) return '-'
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Navbar({ onMobileMenuToggle }) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, notifications } = useUIStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [remoteResults, setRemoteResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [panelNotifications, setPanelNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationActionLoading, setNotificationActionLoading] = useState(null)
  const searchRef = useRef(null)
  const searchBoxRef = useRef(null)
  const notificationsBoxRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      setNotificationsLoading(true)
      const res = await notificationApi.list()
      const data = res?.data?.data
      if (data?.notifications && Array.isArray(data.notifications)) {
        setPanelNotifications(data.notifications)
      }
    } catch (err) {
      console.warn('Failed to load notifications', err?.message)
    } finally {
      setNotificationsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 45000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const allNotifications = useMemo(() => {
    const list = [...panelNotifications]
    const fetchedIds = new Set(list.map((n) => String(n.id)))
    for (const clientN of notifications || []) {
      if (!fetchedIds.has(String(clientN.id))) {
        list.unshift(clientN)
      }
    }
    return list
  }, [panelNotifications, notifications])

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.read).length
  }, [allNotifications])

  const handleNotificationClick = async (n) => {
    setPanelNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    )
    useUIStore.getState().markNotificationRead(n.id)
    try {
      await notificationApi.markRead(n.id)
    } catch {
      // non-fatal
    }
    setShowNotifications(false)
    if (n.link) {
      router.push(n.link)
    }
  }

  const handleMarkAllRead = async () => {
    const syntheticIds = allNotifications.map((n) => n.id)
    setPanelNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    useUIStore.getState().markAllRead()
    try {
      await notificationApi.markAllRead(syntheticIds)
    } catch {
      // non-fatal
    }
  }

  const handleInterviewAssignmentResponse = async (notification, decision, event) => {
    event?.stopPropagation()
    const metadata = notification?.metadata
    if (!metadata?.interviewId || notificationActionLoading) return
    setNotificationActionLoading(`${notification.id}:${decision}`)
    try {
      await interviewApi.respondToAssignment(metadata.interviewId, { decision, notificationId: notification.id })
      setPanelNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, read: true, metadata: { ...item.metadata, decision } } : item))
      await fetchNotifications()
    } catch (error) {
      console.error('Failed to respond to interview assignment:', error)
    } finally {
      setNotificationActionLoading(null)
    }
  }
  const profilePath = PROFILE_PATH_BY_ROLE[user?.role] || (user ? `/${user.role?.toLowerCase().replace('_', '-')}/dashboard` : '/login')
  const panelLabel = ROLE_PANEL_LABELS[user?.role] || 'Dashboard'
  const navResults = filterByModuleAccess(SEARCH_NAV_BY_ROLE[user?.role] || SEARCH_NAV_BY_ROLE.EMPLOYEE, user)
  const query = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    const local = query
      ? navResults.filter((item) => searchableText(item).includes(query))
      : navResults.slice(0, 6)
    const remote = query
      ? remoteResults.filter((item) => searchableText(item).includes(query))
      : []

    return [...local, ...remote].slice(0, 10)
  }, [navResults, query, remoteResults])

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowSearch(true)
      }
      if (event.key === 'Escape') setShowSearch(false)
    }

    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSearch(false)
      }
      if (notificationsBoxRef.current && !notificationsBoxRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!showSearch) return

    const timer = setTimeout(() => searchRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [showSearch])

  useEffect(() => {
    if (!showSearch || query.length < 2) {
      setRemoteResults([])
      setSearchLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const { searchApi } = await import('@/services/searchApi')
        const res = await searchApi.global(query, { signal: controller.signal })
        if (!cancelled) setRemoteResults(res.data.data || [])
      } catch (err) {
        if (!cancelled && err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          setRemoteResults([])
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [showSearch, query])

  function goToSearchResult(item) {
    setSearch('')
    setShowSearch(false)
    router.push(item.path)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    if (searchResults[0]) goToSearchResult(searchResults[0])
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 pb-1 lg:px-6 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md pointer-events-none">

      <div className="w-full pointer-events-auto">
        {/* Transparent toolbar with mobile brand/menu on the left and actions on the right. */}
        <div className="relative flex min-h-12 items-center justify-between gap-3">

          {/* Left: mobile menu plus the current company brand. */}
          <div className="flex items-center gap-2 lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            {user && (
              <button
                type="button"
                onClick={() => router.push(user.role === 'COMPANY_ADMIN' ? '/company/settings' : profilePath)}
                className="flex max-w-[240px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-emerald-700"
                aria-label={`Open ${user.companyName || 'company profile'}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-100 bg-white dark:border-emerald-900/40 dark:bg-slate-800">
                  {user.companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.companyLogoUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  )}
                </span>
                <span className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-700 dark:text-slate-200">{user.companyName || 'KRISCEL TECH'}</span>
              </button>
            )}
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Expanded Search Bar */}
            <div className="hidden md:flex relative w-80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] rounded-xl bg-white dark:bg-slate-900" ref={searchBoxRef}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search here"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setShowSearch(true) }}
                onFocus={() => setShowSearch(true)}
                className="w-full bg-transparent border-0 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 font-medium rounded-xl"
              />
              
              {showSearch && (
                <div className="absolute right-0 top-full mt-3 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-fade-in">
                  <div className="max-h-96 overflow-y-auto p-2">
                    {searchLoading && query && (
                      <div className="px-3 py-2 text-xs text-slate-400">Searching...</div>
                    )}
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={`${item.type}-${item.title}-${item.path}`}
                          type="button"
                          onClick={() => goToSearchResult(item)}
                          className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{item.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-slate-400">
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification */}
            <div className="relative" ref={notificationsBoxRef}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowSearch(false) }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-0.5 text-slate-700 dark:text-slate-300"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4" strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Notifications</span>
                      {unreadCount > 0 ? (
                        <span className="text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                          {unreadCount} new
                        </span>
                      ) : (
                        <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                          All caught up
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {allNotifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        No notifications right now
                      </div>
                    ) : (
                      allNotifications.slice(0, 15).map((n) => {
                        const typeDotColor =
                          n.type === 'error' || n.category === 'security'
                            ? 'bg-rose-500'
                            : n.type === 'warning' || n.category === 'leave'
                            ? 'bg-amber-500'
                            : n.type === 'success' || n.category === 'payroll'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'

                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                              !n.read ? 'bg-blue-50/25 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  !n.read ? typeDotColor : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-sm truncate ${
                                      !n.read
                                        ? 'font-semibold text-slate-900 dark:text-slate-100'
                                        : 'font-medium text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {n.title}
                                  </p>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {formatRelativeTime(n.time)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {n.message}
                                </p>
                                {n.metadata?.kind === 'INTERVIEW_ASSIGNMENT' && n.metadata?.decision === 'PENDING' && (
                                  <div className="mt-2 flex gap-2" onClick={(event) => event.stopPropagation()}>
                                    <button type="button" disabled={!!notificationActionLoading} onClick={(event) => handleInterviewAssignmentResponse(n, 'ACCEPTED', event)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50">{notificationActionLoading === `${n.id}:ACCEPTED` ? 'Approving...' : 'Approve'}</button>
                                    <button type="button" disabled={!!notificationActionLoading} onClick={(event) => handleInterviewAssignmentResponse(n, 'REJECTED', event)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 disabled:opacity-50 dark:bg-rose-950/40 dark:text-rose-300">{notificationActionLoading === `${n.id}:REJECTED` ? 'Rejecting...' : 'Reject'}</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                      onClick={() => {
                        setShowNotifications(false)
                        router.push('/notifications')
                      }}
                      className="w-full text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center justify-center gap-1.5"
                    >
                      View all notifications
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowSearch(false) }}
                className="flex items-center ml-2 transition-all hover:-translate-y-0.5"
              >
                <div className="relative shadow-md rounded-full">
                  <Avatar name={user?.name || 'U'} src={user?.profilePhotoUrl} size="sm" />
                </div>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-[290px] overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 z-50 animate-fade-in">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="flex items-center gap-3">
                      <Avatar name={user?.name || 'U'} src={user?.profilePhotoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{user?.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{user?.role?.replaceAll('_', ' ')}</span>
                          {user?.employeeCode && <span className="text-[10px] font-semibold text-slate-400">{user.employeeCode}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1.5 pb-1 pt-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Settings Menu</span>
                    <button
                      type="button"
                      onClick={() => { setShowProfile(false); router.push(profilePath) }}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                    >
                      <LayoutGrid className="h-3 w-3" />
                      View All
                    </button>
                  </div>
                  <div className="space-y-1 px-1.5 pb-2">
                    <button
                      onClick={() => { setShowProfile(false); router.push(profilePath) }}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 text-left transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><User className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Profile Settings</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">Personal info, photo & contact</span></span>
                      <ChevronRight className="h-4 w-4 text-indigo-500" />
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); router.push(profilePath) }}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Shield className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Security</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">Password & account protection</span></span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); router.push(user?.role === 'COMPANY_ADMIN' ? '/company/settings' : profilePath) }}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Briefcase className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Project Settings</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">Workspace preferences</span></span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); router.push(user?.role === 'COMPANY_ADMIN' ? '/company/settings' : profilePath) }}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><CalendarDays className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Holiday Settings</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">Company holidays & calendar</span></span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  </div>
                  <div className="border-t border-slate-200/70 px-1.5 pt-2 dark:border-slate-700">
                    <button
                      onClick={() => logout()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
