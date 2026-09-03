import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export { ROLES, ROLE_DASHBOARDS, ROLE_PANEL_LABELS } from './roleDashboards'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (value) => String(value).padStart(2, '0')

function coerceDate(date) {
  if (!date) return null
  const value = date instanceof Date ? date : new Date(date)
  return Number.isNaN(value.getTime()) ? null : value
}

export const formatDate = (date, pattern = 'dd MMM yyyy') => {
  if (!date) return '—'
  try {
    const d = coerceDate(date)
    if (!d) return 'â€”'
    const hours24 = d.getHours()
    const replacements = {
      yyyy: String(d.getFullYear()),
      yy: String(d.getFullYear()).slice(-2),
      MMM: MONTH_SHORT[d.getMonth()],
      dd: pad(d.getDate()),
      HH: pad(hours24),
      hh: pad(hours24 % 12 || 12),
      mm: pad(d.getMinutes()),
      a: hours24 >= 12 ? 'PM' : 'AM',
    }
    return pattern.replace(/yyyy|yy|MMM|dd|HH|hh|mm|a/g, (token) => replacements[token])
  } catch {
    return '—'
  }
}

export const formatRelativeTime = (date) => {
  if (!date) return '—'
  try {
    const d = coerceDate(date)
    if (!d) return 'â€”'
    const seconds = Math.round((d.getTime() - Date.now()) / 1000)
    const abs = Math.abs(seconds)
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (abs < 60) return rtf.format(seconds, 'second')
    const minutes = Math.round(seconds / 60)
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
    const days = Math.round(hours / 24)
    if (Math.abs(days) < 30) return rtf.format(days, 'day')
    const months = Math.round(days / 30)
    if (Math.abs(months) < 12) return rtf.format(months, 'month')
    return rtf.format(Math.round(months / 12), 'year')
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
  // Resume parsing statuses (Step 6)
  UPLOADED: 'badge-pending',
  PARSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PARSED: 'badge-active',
  REVIEW_REQUIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  // AI match labels + screening/pipeline statuses (Step 7 & 8)
  STRONG_MATCH: 'badge-active',
  GOOD_MATCH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  POTENTIAL_MATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW_MATCH: 'badge-inactive',
  ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  TALENT_POOL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  // Assessment + interview statuses (Step 9 & 10)
  ASSIGNED: 'badge-pending',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OPENED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUBMITTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  EVALUATING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PASSED: 'badge-active',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIRMED: 'badge-active',
  RESCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FEEDBACK_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  NO_SHOW: 'badge-danger',
  ATTENDED: 'badge-active',
  // Selection & compensation statuses (Step 11 & 12)
  PENDING_DECISION: 'badge-pending',
  SELECTED: 'badge-active',
  SELECTION_APPROVAL_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SELECTION_APPROVED: 'badge-active',
  SELECTION_REJECTED: 'badge-danger',
  ADDITIONAL_ROUND: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  WITHDRAWN: 'badge-inactive',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REVISION_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  READY_FOR_OFFER: 'badge-active',
  // Offer statuses (Step 13 & 14) — SENT already defined above (assessment statuses), reused as-is.
  VIEWED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ACCEPTED: 'badge-active',
  DECLINED: 'badge-danger',
  // Preboarding statuses (Step 15 & 16) — NO_SHOW already defined above (interview statuses), reused as-is.
  INFORMATION_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOCUMENTS_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VERIFICATION_PENDING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  READY_TO_JOIN: 'badge-active',
  JOINED: 'badge-active',
  CANCELLED: 'badge-inactive',
  NOT_SENT: 'badge-inactive',
  OPENED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CORRECTION_REQUIRED: 'badge-danger',
  // APPROVED/REJECTED/VERIFIED already defined above, reused as-is.
  NOT_UPLOADED: 'badge-inactive',
  UPLOADED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REPLACEMENT_REQUIRED: 'badge-danger',
  WAIVED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const truncate = (str, maxLen = 40) => {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}
