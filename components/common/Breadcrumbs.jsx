'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const LABELS = {
  'super-admin': 'Super Admin',
  dashboard: 'Dashboard',
  tenants: 'Companies',
  plans: 'Plans',
  subscriptions: 'Subscriptions',
  billing: 'Billing',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
}

function labelFor(segment) {
  if (LABELS[segment]) return LABELS[segment]
  // Mongo ObjectId-shaped segments (detail routes) render as "Details"
  // rather than a raw 24-char hex string.
  if (/^[a-f0-9]{24}$/i.test(segment)) return 'Details'
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((segment, i) => ({
    label: labelFor(segment),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav aria-label="Breadcrumb" className="ml-2 -mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1 overflow-x-auto">
      <Link href="/" className="flex items-center hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5 flex-shrink-0">
          <ChevronRight className="w-3 h-3" />
          {crumb.isLast ? (
            <span className="text-slate-600 dark:text-slate-300 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-slate-600 dark:hover:text-slate-300">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
