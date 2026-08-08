import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date, pattern = 'dd MMM yyyy') => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, pattern)
  } catch {
    return '—'
  }
}

export const formatRelativeTime = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatNumber = (num) => {
  if (num == null) return '—'
  return new Intl.NumberFormat('en-IN').format(num)
}

export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const getAvatarColor = (name = '') => {
  const colors = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-blue-500',
    'bg-teal-500',
  ]
  const index = (name.charCodeAt(0) || 0) % colors.length
  return colors[index]
}

export const STATUS_COLORS = {
  Active: 'badge-active',
  active: 'badge-active',
  ACTIVE: 'badge-active',
  Inactive: 'badge-inactive',
  inactive: 'badge-inactive',
  INACTIVE: 'badge-inactive',
  Inactive: 'badge-inactive',
  Pending: 'badge-pending',
  pending: 'badge-pending',
  PENDING: 'badge-pending',
  PROBATION: 'badge-pending',
  Trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TRIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Expired: 'badge-danger',
  expired: 'badge-danger',
  EXPIRED: 'badge-danger',
  Suspended: 'badge-danger',
  suspended: 'badge-danger',
  SUSPENDED: 'badge-danger',
  GRACE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ARCHIVED: 'badge-inactive',
  PURGE_SCHEDULED: 'badge-danger',
  PURGED: 'badge-inactive',
  VALIDATING: 'badge-pending',
  PROVISIONING: 'badge-pending',
  COMPLETED: 'badge-active',
  PARTIALLY_COMPLETED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FAILED: 'badge-danger',
  ROLLED_BACK: 'badge-inactive',
  RUNNING: 'badge-pending',
  SKIPPED: 'badge-inactive',
  Approved: 'badge-active',
  APPROVED: 'badge-active',
  Rejected: 'badge-danger',
  REJECTED: 'badge-danger',
  CANCELLED: 'badge-inactive',
  DRAFT: 'badge-pending',
  Open: 'badge-pending',
  Closed: 'badge-inactive',
  Resolved: 'badge-active',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  JOB_CREATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OPEN: 'badge-active',
  PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FILLED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PUBLISHED: 'badge-active',
  QUEUED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PUBLISHING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REMOVED: 'badge-inactive',
  EXPIRED: 'badge-inactive',
  NOT_CONNECTED: 'badge-inactive',
  CONNECTED: 'badge-active',
}

export const truncate = (str, maxLen = 40) => {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  FINANCE: 'FINANCE',
  IT_ADMIN: 'IT_ADMIN',
}

export const ROLE_DASHBOARDS = {
  [ROLES.SUPER_ADMIN]: '/super-admin/dashboard',
  [ROLES.COMPANY_ADMIN]: '/company/dashboard',
  [ROLES.HR_MANAGER]: '/hr/dashboard',
  [ROLES.MANAGER]: '/manager/dashboard',
  [ROLES.EMPLOYEE]: '/employee/dashboard',
  [ROLES.FINANCE]: '/hr/payroll',
  [ROLES.IT_ADMIN]: '/hr/helpdesk',
}

export const ROLE_PANEL_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin Panel',
  [ROLES.COMPANY_ADMIN]: 'Company Admin Panel',
  [ROLES.HR_MANAGER]: 'HR Panel',
  [ROLES.MANAGER]: 'Manager Panel',
  [ROLES.EMPLOYEE]: 'Employee Panel',
  [ROLES.FINANCE]: 'Finance Panel',
  [ROLES.IT_ADMIN]: 'IT Admin Panel',
}
