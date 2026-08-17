'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { MODULE_ACCESS, filterByModuleAccess } from '@/lib/moduleAccess'
import * as Icons from 'lucide-react'

// Recruitment module sub-nav — distinct from the global app rail (which just
// links /hr/recruitment once). Only Dashboard is wired to real functionality
// in Step 1; every other item routes to a page rendering "Coming Soon".
export const RECRUITMENT_NAV = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/hr/recruitment', exact: true, moduleKey: MODULE_ACCESS.RECRUITMENT },
  { label: 'Job Requisitions', icon: 'FileStack', path: '/hr/recruitment/requisitions', moduleKey: MODULE_ACCESS.REQUISITIONS },
  { label: 'Open Positions', icon: 'Briefcase', path: '/hr/recruitment/jobs', moduleKey: MODULE_ACCESS.JOBS },
  { label: 'Candidates', icon: 'Users', path: '/hr/recruitment/candidates', moduleKey: MODULE_ACCESS.CANDIDATES },
  { label: 'Pipeline', icon: 'GitBranch', path: '/hr/recruitment/pipeline', moduleKey: MODULE_ACCESS.PIPELINE },
  { label: 'Interviews', icon: 'CalendarCheck', path: '/hr/recruitment/interviews', moduleKey: MODULE_ACCESS.INTERVIEWS },
  { label: 'Assessments', icon: 'ClipboardCheck', path: '/hr/recruitment/assessments', moduleKey: MODULE_ACCESS.ASSESSMENTS },
  { label: 'Selections', icon: 'BadgeCheck', path: '/hr/recruitment/selections', moduleKey: MODULE_ACCESS.SELECTIONS },
  { label: 'Compensation', icon: 'IndianRupee', path: '/hr/recruitment/compensation', moduleKey: MODULE_ACCESS.COMPENSATION },
  { label: 'Offers', icon: 'FileSignature', path: '/hr/recruitment/offers', moduleKey: MODULE_ACCESS.OFFERS },
  { label: 'Onboarding', icon: 'UserCheck', path: '/hr/recruitment/onboarding', moduleKey: MODULE_ACCESS.ONBOARDING },
  { label: 'Career Page', icon: 'Globe', path: '/hr/recruitment/career-page', moduleKey: MODULE_ACCESS.CAREER_PAGE },
  { label: 'Reports', icon: 'BarChart2', path: '/hr/recruitment/reports', moduleKey: MODULE_ACCESS.RECRUITMENT_REPORTS },
  { label: 'Settings', icon: 'Settings', path: '/hr/recruitment/settings', moduleKey: MODULE_ACCESS.RECRUITMENT_SETTINGS },
]

function isItemActive(pathname, item) {
  return item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/')
}

// Dev-only — never rendered in a production build. Jumps HR straight to
// their own tenant's real public careers site (careersPagePath's URL shape,
// same helper `lib/publicJobHelpers.js` uses) so one person can play both
// HR and candidate while manually testing the recruitment flow, without
// hunting for the company slug or leaving the HR panel to look it up.
const DEV_TOOLS_ENABLED = process.env.NODE_ENV !== 'production'

export function RecruitmentSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const navItems = filterByModuleAccess(RECRUITMENT_NAV, user)
  const showCandidateDevLink = DEV_TOOLS_ENABLED && !!user?.companySlug

  return (
    <aside className="w-full lg:w-56 flex-shrink-0">
      {/* Mobile: horizontal scrollable pill strip. Desktop: vertical card, sticky under the navbar. */}
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:sticky lg:top-6 bg-white dark:bg-slate-900 lg:border lg:border-slate-100 lg:dark:border-slate-800 lg:rounded-2xl lg:shadow-sm lg:p-2 -mx-1 px-1 lg:mx-0 lg:px-2">
        {navItems.map((item) => {
          const IconComp = Icons[item.icon] || Icons.Circle
          const active = isItemActive(pathname, item)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-150 flex-shrink-0 lg:flex-shrink',
                active
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <IconComp className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {showCandidateDevLink && (
          <>
            <div className="hidden lg:block my-1 border-t border-dashed border-amber-300 dark:border-amber-800" />
            <a
              href={`/${user.companySlug}/careers`}
              target="_blank"
              rel="noopener noreferrer"
              title="Dev only — opens your company's real public careers site in a new tab, so you can apply as a candidate to test the flow"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-150 flex-shrink-0 lg:flex-shrink text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800"
            >
              <Icons.FlaskConical className="w-4 h-4 flex-shrink-0" />
              Test as Candidate
              <Icons.ExternalLink className="w-3 h-3 flex-shrink-0 ml-auto opacity-60" />
            </a>
          </>
        )}
      </nav>
    </aside>
  )
}
