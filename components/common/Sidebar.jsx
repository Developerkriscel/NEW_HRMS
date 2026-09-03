'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { MODULE_ACCESS, filterByModuleAccess } from '@/lib/moduleAccess'
import {
  Banknote,
  BarChart2,
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Circle,
  Clock,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  Headphones,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MapPin,
  Monitor,
  Receipt,
  Repeat,
  ScrollText,
  Send,
  Settings,
  Tag,
  TrendingUp,
  UserCheck,
  UserCircle,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

// Kept in sync by hand with the literal Tailwind classes below.
export const SIDEBAR_COLLAPSED_WIDTH = 64

const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/super-admin/dashboard' },
  { label: 'Companies', icon: 'Building2', path: '/super-admin/tenants' },
  { label: 'Plans', icon: 'CreditCard', path: '/super-admin/plans', permission: 'plan.view' },
  { label: 'Subscriptions', icon: 'Repeat', path: '/super-admin/subscriptions', permission: 'subscription.view' },
  { label: 'Billing', icon: 'Receipt', path: '/super-admin/billing' },
  { label: 'Audit Logs', icon: 'ScrollText', path: '/super-admin/audit-logs' },
  { label: 'Settings', icon: 'Settings', path: '/super-admin/settings' },
]

const COMPANY_ADMIN_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/company/dashboard' },
  { label: 'Employees', icon: 'Users', path: '/company/employees', moduleKey: MODULE_ACCESS.EMPLOYEES },
  { label: 'Attendance', icon: 'Clock', path: '/hr/attendance', moduleKey: MODULE_ACCESS.ATTENDANCE },
  { label: 'Leave', icon: 'CalendarOff', path: '/hr/leave', moduleKey: MODULE_ACCESS.LEAVE },
  { label: 'Payroll', icon: 'Banknote', path: '/hr/payroll', moduleKey: MODULE_ACCESS.PAYROLL },
  { label: 'Recruitment', icon: 'UserPlus', path: '/hr/recruitment', moduleKey: MODULE_ACCESS.RECRUITMENT },
  { label: 'Onboarding', icon: 'UserCheck', path: '/hr/onboarding', moduleKey: MODULE_ACCESS.ONBOARDING },
  { label: 'Offboarding', icon: 'UserMinus', path: '/hr/offboarding', moduleKey: MODULE_ACCESS.OFFBOARDING },
  { label: 'Assets', icon: 'Monitor', path: '/hr/assets', moduleKey: MODULE_ACCESS.ASSETS },
  { label: 'Documents', icon: 'FileText', path: '/hr/documents', moduleKey: MODULE_ACCESS.DOCUMENTS },
  { label: 'Helpdesk', icon: 'Headphones', path: '/hr/helpdesk', moduleKey: MODULE_ACCESS.HELPDESK },
  { label: 'Training', icon: 'GraduationCap', path: '/hr/training', moduleKey: MODULE_ACCESS.TRAINING },
  { label: 'Reports', icon: 'BarChart2', path: '/company/reports', moduleKey: MODULE_ACCESS.REPORTS },
  { label: 'Audit Logs', icon: 'ScrollText', path: '/company/audit-logs', moduleKey: MODULE_ACCESS.AUDIT_LOGS },
  { label: 'Settings', icon: 'Settings', path: '/company/settings', moduleKey: MODULE_ACCESS.SETTINGS },
]

const HR_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/hr/dashboard' },
  { label: 'Employees', icon: 'Users', path: '/hr/employees', moduleKey: MODULE_ACCESS.EMPLOYEES },
  { label: 'Attendance', icon: 'Clock', path: '/hr/attendance', moduleKey: MODULE_ACCESS.ATTENDANCE },
  { label: 'Leave & Approvals', icon: 'CalendarOff', path: '/hr/leave', moduleKey: MODULE_ACCESS.LEAVE },
  { label: 'Payroll', icon: 'Banknote', path: '/hr/payroll', moduleKey: MODULE_ACCESS.PAYROLL },
  { label: 'Recruitment', icon: 'UserPlus', path: '/hr/recruitment', moduleKey: MODULE_ACCESS.RECRUITMENT },
  { label: 'Onboarding', icon: 'UserCheck', path: '/hr/onboarding', moduleKey: MODULE_ACCESS.ONBOARDING },
  { label: 'Offboarding', icon: 'UserMinus', path: '/hr/offboarding', moduleKey: MODULE_ACCESS.OFFBOARDING },

  { label: 'Assets', icon: 'Monitor', path: '/hr/assets', moduleKey: MODULE_ACCESS.ASSETS },
  { label: 'Documents', icon: 'FileText', path: '/hr/documents', moduleKey: MODULE_ACCESS.DOCUMENTS },
  { label: 'Helpdesk', icon: 'Headphones', path: '/hr/helpdesk', moduleKey: MODULE_ACCESS.HELPDESK },
  { label: 'Training', icon: 'GraduationCap', path: '/hr/training', moduleKey: MODULE_ACCESS.TRAINING },
  { label: 'Reports', icon: 'BarChart2', path: '/hr/reports', moduleKey: MODULE_ACCESS.REPORTS },
  { label: 'Settings', icon: 'Settings', path: '/hr/settings', moduleKey: MODULE_ACCESS.SETTINGS },
  { label: 'Profile', icon: 'UserCircle', path: '/hr/profile' },
]

const MANAGER_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/manager/dashboard' },
  { label: 'My Team', icon: 'Users', path: '/manager/team' },
  { label: 'Leave & Approvals', icon: 'CalendarCheck', path: '/manager/leave' },
  { label: 'Attendance', icon: 'Clock', path: '/manager/attendance' },
  { label: 'Reports', icon: 'BarChart2', path: '/manager/reports' },
  { label: 'My Payslips', icon: 'Banknote', path: '/manager/payslips' },
  { label: 'My Expenses', icon: 'Receipt', path: '/manager/expenses' },
  { label: 'My Documents', icon: 'FileText', path: '/manager/documents' },
  { label: 'My Assets', icon: 'Monitor', path: '/manager/assets' },
  { label: 'Training', icon: 'GraduationCap', path: '/manager/training' },
  { label: 'Referrals', icon: 'UserPlus', path: '/manager/referrals' },
  { label: 'Offboarding', icon: 'LogOut', path: '/manager/offboarding' },
  { label: 'Profile', icon: 'UserCircle', path: '/manager/profile' },
]

const EMPLOYEE_NAV = [
  { label: 'My Dashboard', icon: 'LayoutDashboard', path: '/employee/dashboard' },
  { label: 'Attendance', icon: 'Clock', path: '/employee/attendance' },
  { label: 'Leave', icon: 'CalendarOff', path: '/employee/leave' },

  { label: 'Payslips', icon: 'Banknote', path: '/employee/payslips' },
  { label: 'Expenses', icon: 'Receipt', path: '/employee/expenses' },

  { label: 'Documents', icon: 'FileText', path: '/employee/documents' },
  { label: 'Assets', icon: 'Monitor', path: '/employee/assets' },
  { label: 'Helpdesk', icon: 'Headphones', path: '/employee/helpdesk' },
  { label: 'Training', icon: 'GraduationCap', path: '/employee/training' },
  { label: 'Referrals', icon: 'UserPlus', path: '/employee/referrals' },
  { label: 'Offboarding', icon: 'LogOut', path: '/employee/offboarding' },
  { label: 'Profile', icon: 'UserCircle', path: '/employee/profile' },
]

const NAV_BY_ROLE = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  COMPANY_ADMIN: COMPANY_ADMIN_NAV,
  HR_MANAGER: HR_NAV,
  FINANCE: HR_NAV,
  IT_ADMIN: HR_NAV,
  MANAGER: MANAGER_NAV,
  EMPLOYEE: EMPLOYEE_NAV,
}

const ICONS = {
  Banknote,
  BarChart2,
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Clock,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  Headphones,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MapPin,
  Monitor,
  Receipt,
  Repeat,
  ScrollText,
  Send,
  Settings,
  Tag,
  TrendingUp,
  UserCheck,
  UserCircle,
  UserMinus,
  UserPlus,
  Users,
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

const DARK_COLORS = [
  'text-blue-700 dark:text-blue-400', 'text-emerald-700 dark:text-emerald-400', 'text-violet-700 dark:text-violet-400', 'text-rose-700 dark:text-rose-400',
  'text-sky-700 dark:text-sky-400', 'text-fuchsia-700 dark:text-fuchsia-400', 'text-teal-700 dark:text-teal-400', 'text-amber-700 dark:text-amber-400',
  'text-indigo-700 dark:text-indigo-400', 'text-pink-700 dark:text-pink-400', 'text-cyan-700 dark:text-cyan-400', 'text-orange-700 dark:text-orange-400'
]

function NavItem({ item, index = 0 }) {
  const pathname = usePathname()
  const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
  const IconComp = ICONS[item.icon] || Circle
  const iconColorClass = isActive ? 'text-white' : DARK_COLORS[index % DARK_COLORS.length]

  return (
    <Link
      href={item.path}
      prefetch={true}
      className={cx(
        'sidebar-item w-full overflow-hidden group/navitem transition-transform duration-200 hover:translate-x-1',
        'lg:justify-center lg:gap-0 lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:gap-2.5',
        isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
      )}
    >
      <IconComp className={cx("w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover/navitem:scale-110", iconColorClass, isActive && "drop-shadow-md")} strokeWidth={isActive ? 2.5 : 2} />
      <span
        className="truncate text-sm transition-all duration-200 lg:max-w-0 lg:opacity-0 lg:group-hover/sidebar:max-w-[140px] lg:group-hover/sidebar:opacity-100"
      >
        {item.label}
      </span>
    </Link>
  )
}

export function Sidebar({ mobileOpen, onDesktopHoverChange, onMobileClose }) {
  const { user, hasPermission } = useAuthStore()

  const navItems = filterByModuleAccess(NAV_BY_ROLE[user?.role] || EMPLOYEE_NAV, user).filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  return (
    <>
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      <aside
        onMouseEnter={() => onDesktopHoverChange?.(true)}
        onMouseLeave={() => onDesktopHoverChange?.(false)}
        className={cx(
          'group/sidebar fixed left-4 top-[54%] -translate-y-1/2 z-50 flex flex-col overflow-hidden pointer-events-auto',
          'w-[208px] lg:w-16 lg:hover:w-[208px] max-h-[calc(100vh-8rem)]',
          'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-800/50',
          'shadow-[4px_4px_20px_rgba(0,0,0,0.05),-4px_-4px_20px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_20px_rgba(0,0,0,0.4)]',
          'hover:shadow-[8px_8px_30px_rgba(0,0,0,0.08),-8px_-8px_30px_rgba(255,255,255,0.9)] dark:hover:shadow-[8px_8px_30px_rgba(0,0,0,0.5)]',
          'lg:translate-x-0 transition-all duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-end px-3 pt-3 pb-1 flex-shrink-0 lg:hidden">
          <button
            onClick={onMobileClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <nav className="overflow-y-auto px-2 py-2 space-y-0.5">
          {navItems.map((item, index) => (
            <NavItem key={item.path} item={item} index={index} />
          ))}
        </nav>
      </aside>
    </>
  )
}
