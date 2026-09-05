import React from 'react'

export function OnboardingStatusBadge({ status, className = '' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLETED':
      case 'JOINED':
        return { label: 'Completed', classes: 'badge-active' }
      case 'IN_PROGRESS':
      case 'INFORMATION_PENDING':
      case 'DOCUMENTS_PENDING':
      case 'VERIFICATION_PENDING':
        return { label: 'In Progress', classes: 'badge-pending' }
      case 'READY_TO_JOIN':
        return { label: 'Ready to Join', classes: 'badge-active' }
      case 'ON_HOLD':
        return { label: 'On Hold', classes: 'badge-inactive' }
      case 'CANCELLED':
      case 'NO_SHOW':
        return { label: 'Cancelled', classes: 'badge-danger' }
      case 'ACCEPTED':
        return { label: 'Accepted Offer', classes: 'badge-pending' }
      case 'NOT_STARTED':
      default:
        return { label: 'Not Started', classes: 'badge-inactive bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 border-dashed' }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.classes} ${className}`}>
      {config.label}
    </span>
  )
}
