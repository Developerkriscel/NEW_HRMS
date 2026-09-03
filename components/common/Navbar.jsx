'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Moon, Sun, Menu, Search, LogOut, Settings, User, ChevronDown, HelpCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Avatar } from '@/components/common/Avatar'
import { ROLE_PANEL_LABELS } from '@/lib/roleDashboards'
import { MODULE_ACCESS, filterByModuleAccess } from '@/lib/moduleAccess'

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Leave approved', message: 'Your leave for Dec 25 has been approved', time: new Date(Date.now() - 3600000), read: false, type: 'success' },
  { id: 2, title: 'Payslip generated', message: 'Your November payslip is ready', time: new Date(Date.now() - 86400000), read: false, type: 'info' },
  { id: 3, title: 'Document reminder', message: 'PAN card upload pending', time: new Date(Date.now() - 172800000), read: true, type: 'warning' },
]

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
  const searchRef = useRef(null)
  const searchBoxRef = useRef(null)

  const allNotifications = [...MOCK_NOTIFICATIONS, ...notifications]
  const unreadCount = allNotifications.filter((n) => !n.read).length
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
    <header className="sticky top-0 z-30 px-4 pt-3 pb-1 lg:px-6 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md pointer-events-none">
      {/* Fixed Desktop Logo Removed to prevent overlap with greeting */}

      <div className="max-w-[1400px] mx-auto pointer-events-auto">
        {/* Transparent toolbar with mobile brand/menu on the left and actions on the right. */}
        <div className="flex min-h-10 items-center justify-between gap-3">

          {/* Left: Greeting (Desktop) & Mobile Brand */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight">
                NexaHR
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-1 py-1 lg:hidden">
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight hidden sm:inline">
                NexaHR
              </span>
            </div>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-4">
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

            {/* Help Icon */}
            <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-0.5 text-slate-700 dark:text-slate-300">
              <HelpCircle className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* Notification */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowSearch(false) }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-[4px_4px_10px_rgba(0,0,0,0.05),-4px_-4px_10px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-0.5 text-slate-700 dark:text-slate-300"
              >
                <Bell className="w-4 h-4" strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
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
                className="flex items-center ml-2 transition-all hover:-translate-y-0.5"
              >
                <div className="relative shadow-md rounded-full">
                  <Avatar name={user?.name || 'U'} size="sm" />
                </div>
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
