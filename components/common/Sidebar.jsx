'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { X } from 'lucide-react'
import * as Icons from 'lucide-react'

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
  { label: 'Company Profile', icon: 'Building', path: '/company/profile' },
  { label: 'Employees', icon: 'Users', path: '/company/employees' },
  { label: 'Departments', icon: 'Layers', path: '/company/departments' },
  { label: 'Designations', icon: 'Tag', path: '/company/designations' },
  { label: 'Branches', icon: 'MapPin', path: '/company/branches' },
  { label: 'Shifts', icon: 'Clock3', path: '/company/shifts' },
  { label: 'Holidays', icon: 'CalendarDays', path: '/company/holidays' },
  { label: 'Roles & Permissions', icon: 'KeyRound', path: '/company/roles' },
  { label: 'Attendance', icon: 'Clock', path: '/hr/attendance' },
  { label: 'Leave', icon: 'CalendarOff', path: '/hr/leave' },
  { label: 'Payroll', icon: 'Banknote', path: '/hr/payroll' },
  { label: 'Reports', icon: 'BarChart2', path: '/company/reports' },
  { label: 'Audit Logs', icon: 'ScrollText', path: '/company/audit-logs' },
  { label: 'Settings', icon: 'Settings', path: '/company/settings' },
]

const HR_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/hr/dashboard' },
  { label: 'Employees', icon: 'Users', path: '/hr/employees' },
  { label: 'Attendance', icon: 'Clock', path: '/hr/attendance' },
  { label: 'Leave', icon: 'CalendarOff', path: '/hr/leave' },
  { label: 'Payroll', icon: 'Banknote', path: '/hr/payroll' },
  { label: 'Recruitment', icon: 'UserPlus', path: '/hr/recruitment' },
  { label: 'Onboarding', icon: 'UserCheck', path: '/hr/onboarding' },
  { label: 'Offboarding', icon: 'UserMinus', path: '/hr/offboarding' },
  { label: 'Performance', icon: 'TrendingUp', path: '/hr/performance' },
  { label: 'Assets', icon: 'Monitor', path: '/hr/assets' },
  { label: 'Documents', icon: 'FileText', path: '/hr/documents' },
  { label: 'Helpdesk', icon: 'Headphones', path: '/hr/helpdesk' },
  { label: 'Training', icon: 'GraduationCap', path: '/hr/training' },
  { label: 'Reports', icon: 'BarChart2', path: '/hr/reports' },
]

const MANAGER_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/manager/dashboard' },
  { label: 'My Team', icon: 'Users', path: '/manager/team' },
  { label: 'Approvals', icon: 'CalendarCheck', path: '/manager/leave-approvals' },
  { label: 'Attendance', icon: 'Clock', path: '/manager/attendance' },
  { label: 'Tasks', icon: 'ListTodo', path: '/manager/tasks' },
  { label: 'Performance', icon: 'TrendingUp', path: '/manager/performance' },
  { label: 'Reports', icon: 'BarChart2', path: '/manager/reports' },
]

const EMPLOYEE_NAV = [
  { label: 'My Dashboard', icon: 'LayoutDashboard', path: '/employee/dashboard' },
  { label: 'Attendance', icon: 'Clock', path: '/employee/attendance' },
  { label: 'Leave', icon: 'CalendarOff', path: '/employee/leave' },
  { label: 'Tasks', icon: 'ListTodo', path: '/employee/tasks' },
  { label: 'Performance', icon: 'TrendingUp', path: '/employee/performance' },
  { label: 'Payslips', icon: 'Banknote', path: '/employee/payslips' },
  { label: 'Expenses', icon: 'Receipt', path: '/employee/expenses' },
  { label: 'Requests', icon: 'Send', path: '/employee/requests' },
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

function NavItem({ item }) {
  const pathname = usePathname()
  const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
  const IconComp = Icons[item.icon] || Icons.Circle

  return (
    <Link
      href={item.path}
      className={cn(
        'sidebar-item overflow-hidden lg:justify-center lg:group-hover/sidebar:justify-start',
        isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
      )}
    >
      <IconComp className="w-5 h-5 flex-shrink-0" />
      <span className="truncate text-sm transition-all duration-200 lg:max-w-0 lg:opacity-0 lg:group-hover/sidebar:max-w-[140px] lg:group-hover/sidebar:opacity-100">
        {item.label}
      </span>
    </Link>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, hasPermission } = useAuthStore()

  const navItems = (NAV_BY_ROLE[user?.role] || EMPLOYEE_NAV).filter(
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
        className={cn(
          'group/sidebar fixed left-4 top-[54%] -translate-y-1/2 z-50 flex flex-col overflow-hidden pointer-events-auto',
          'w-[208px] lg:w-16 lg:hover:w-[208px] max-h-[calc(100vh-8rem)]',
          'bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg',
          'lg:translate-x-0 transition-[width,transform] duration-300',
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
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>
      </aside>
    </>
  )
}
