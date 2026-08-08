'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Moon, Sun, Menu, Search, LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Avatar } from '@/components/common/Avatar'
import { searchApi } from '@/services/searchApi'
import { formatRelativeTime, ROLE_PANEL_LABELS } from '@/lib/utils'

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Leave approved', message: 'Your leave for Dec 25 has been approved', time: new Date(Date.now() - 3600000), read: false, type: 'success' },
  { id: 2, title: 'Payslip generated', message: 'Your November payslip is ready', time: new Date(Date.now() - 86400000), read: false, type: 'info' },
  { id: 3, title: 'Document reminder', message: 'PAN card upload pending', time: new Date(Date.now() - 172800000), read: true, type: 'warning' },
]

const PROFILE_PATH_BY_ROLE = {
  SUPER_ADMIN: '/super-admin/settings',
  COMPANY_ADMIN: '/company/settings',
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
    { title: 'Employees', description: 'Employee directory', path: '/company/employees', type: 'Page' },
    { title: 'Departments', description: 'Company departments', path: '/company/departments', type: 'Page' },
    { title: 'Settings', description: 'Company settings', path: '/company/settings', type: 'Page' },
  ],
  HR_MANAGER: [
    { title: 'Dashboard', description: 'HR overview', path: '/hr/dashboard', type: 'Page' },
    { title: 'Employees', description: 'Employee directory', path: '/hr/employees', type: 'Page' },
    { title: 'Attendance', description: 'Attendance records', path: '/hr/attendance', type: 'Page' },
    { title: 'Leave', description: 'Leave requests', path: '/hr/leave', type: 'Page' },
    { title: 'Payroll', description: 'Payroll runs', path: '/hr/payroll', type: 'Page' },
  ],
  FINANCE: [
    { title: 'Payroll', description: 'Payroll runs', path: '/hr/payroll', type: 'Page' },
    { title: 'Reports', description: 'Payroll reports', path: '/hr/reports', type: 'Page' },
  ],
  IT_ADMIN: [
    { title: 'Helpdesk', description: 'Employee tickets', path: '/hr/helpdesk', type: 'Page' },
    { title: 'Assets', description: 'Asset tracking', path: '/hr/assets', type: 'Page' },
  ],
  MANAGER: [
    { title: 'Dashboard', description: 'Manager overview', path: '/manager/dashboard', type: 'Page' },
    { title: 'My Team', description: 'Team members', path: '/manager/team', type: 'Page' },
    { title: 'Approvals', description: 'Pending team approvals', path: '/manager/leave-approvals', type: 'Page' },
    { title: 'Attendance', description: 'Team attendance', path: '/manager/attendance', type: 'Page' },
    { title: 'Tasks', description: 'Assign and track team work', path: '/manager/tasks', type: 'Page' },
    { title: 'Performance', description: 'KRAs and reviews', path: '/manager/performance', type: 'Page' },
    { title: 'Reports', description: 'Team reports', path: '/manager/reports', type: 'Page' },
  ],
  EMPLOYEE: [
    { title: 'My Dashboard', description: 'Employee overview', path: '/employee/dashboard', type: 'Page' },
    { title: 'Attendance', description: 'My attendance', path: '/employee/attendance', type: 'Page' },
    { title: 'Leave', description: 'My leave requests', path: '/employee/leave', type: 'Page' },
    { title: 'Tasks', description: 'Assigned tasks', path: '/employee/tasks', type: 'Page' },
    { title: 'Performance', description: 'KRAs and reviews', path: '/employee/performance', type: 'Page' },
    { title: 'Payslips', description: 'Salary slips', path: '/employee/payslips', type: 'Page' },
    { title: 'Expenses', description: 'Expense claims', path: '/employee/expenses', type: 'Page' },
    { title: 'Requests', description: 'Shift, overtime and WFH requests', path: '/employee/requests', type: 'Page' },
    { title: 'Documents', description: 'My documents', path: '/employee/documents', type: 'Page' },
    { title: 'Assets', description: 'My assigned assets', path: '/employee/assets', type: 'Page' },
    { title: 'Helpdesk', description: 'Support tickets', path: '/employee/helpdesk', type: 'Page' },
    { title: 'Training', description: 'Assigned learning', path: '/employee/training', type: 'Page' },
    { title: 'Offboarding', description: 'Resignation workflow', path: '/employee/offboarding', type: 'Page' },
    { title: 'Profile', description: 'My profile', path: '/employee/profile', type: 'Page' },
  ],
}

const searchableText = (item) => `${item.title} ${item.description || ''} ${item.type || ''}`.toLowerCase()

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
  const searchRef = useRef(null)
  const searchBoxRef = useRef(null)

  const allNotifications = [...MOCK_NOTIFICATIONS, ...notifications]
  const unreadCount = allNotifications.filter((n) => !n.read).length
  const profilePath = PROFILE_PATH_BY_ROLE[user?.role] || (user ? `/${user.role?.toLowerCase().replace('_', '-')}/dashboard` : '/login')
  const panelLabel = ROLE_PANEL_LABELS[user?.role] || 'Dashboard'
  const navResults = SEARCH_NAV_BY_ROLE[user?.role] || SEARCH_NAV_BY_ROLE.EMPLOYEE
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
    <header className="sticky top-0 z-30 px-4 py-3 lg:px-6 pointer-events-none">
      <div className="fixed left-4 top-4 z-40 hidden items-center gap-2.5 pointer-events-auto lg:flex">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
          NexaHR
        </span>
      </div>

      <div className="max-w-[1400px] mx-auto pointer-events-auto">
        {/* Transparent toolbar with mobile brand/menu on the left and actions on the right. */}
        <div className="flex min-h-10 items-center justify-between gap-3">

          {/* Left: mobile menu trigger + brand */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            <div className="flex items-center gap-2.5 px-1 py-1 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight hidden sm:inline">
                NexaHR
              </span>
            </div>
          </div>

          {/* Right: panel name + search + notifications + profile */}
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm dark:bg-slate-900">
            <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 shadow-sm">
              {panelLabel}
            </span>

            <div className="relative" ref={searchBoxRef}>
            <button
              onClick={() => { setShowSearch(!showSearch); setShowNotifications(false); setShowProfile(false) }}
              className="px-4 py-1.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search</span>
            </button>

            {showSearch && (
                <div className="absolute right-0 mt-3 w-[420px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-fade-in">
                  <form onSubmit={handleSearchSubmit} className="border-b border-slate-100 dark:border-slate-800 p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        ref={searchRef}
                        type="search"
                        value={search}
                        onChange={(event) => { setSearch(event.target.value); setShowSearch(true) }}
                        placeholder="Search anything..."
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2 pl-9 pr-16 text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30"
                      />
                      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">Ctrl K</kbd>
                    </div>
                  </form>
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
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">{item.type}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{item.description}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center text-sm text-slate-400">
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Notification */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowSearch(false) }}
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {allNotifications.map((n) => (
                      <div key={n.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(n.time)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                    <button className="w-full text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowSearch(false) }}
              className="flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="relative">
                <Avatar name={user?.name || 'U'} size="sm" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-slate-900" />
              </div>
              <ChevronDown className="hidden md:block w-4 h-4 text-slate-400 mr-1" />
            </button>

            {showProfile && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-fade-in">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowProfile(false); router.push(profilePath) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); router.push(profilePath) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
