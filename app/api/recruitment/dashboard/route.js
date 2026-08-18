export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'

// Step 1 — Recruitment Dashboard is mock data only. There is no candidate
// pipeline, interview, or offer aggregation logic behind these numbers yet;
// this endpoint exists purely to give the dashboard UI a real HTTP round
// trip to render against. Replace each section with a real query once the
// corresponding module (Requisitions, Pipeline, Interviews, Offers, ...)
// is built.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])

  return ok({
    stats: {
      openPositions: 12,
      totalCandidates: 486,
      newApplications: 73,
      interviewsScheduled: 8,
      pendingOffers: 5,
      joiningSoon: 11,
    },

    funnel: [
      { stage: 'Applied', count: 486 },
      { stage: 'Screened', count: 310 },
      { stage: 'Shortlisted', count: 125 },
      { stage: 'Interviewed', count: 68 },
      { stage: 'Selected', count: 22 },
      { stage: 'Offered', count: 17 },
      { stage: 'Accepted', count: 13 },
      { stage: 'Joined', count: 10 },
    ],

    todayInterviews: [
      { id: 'ti1', time: '11:00 AM', candidate: 'Rahul Verma', position: 'Backend Developer', round: 'Technical', interviewer: 'Amit Shah', mode: 'Online' },
      { id: 'ti2', time: '2:30 PM', candidate: 'Priya Nair', position: 'HR Executive', round: 'HR Round', interviewer: 'Neha Kapoor', mode: 'Office' },
    ],

    pendingActions: [
      { id: 'pa1', label: '7 candidates need screening', count: 7, link: '/hr/recruitment/candidates?filter=screening' },
      { id: 'pa2', label: '3 interview feedbacks pending', count: 3, link: '/hr/recruitment/interviews?filter=feedback-pending' },
      { id: 'pa3', label: '2 offers need approval', count: 2, link: '/hr/recruitment/offers?filter=pending-approval' },
      { id: 'pa4', label: '4 offers expire soon', count: 4, link: '/hr/recruitment/offers?filter=expiring' },
      { id: 'pa5', label: '8 onboarding documents pending', count: 8, link: '/hr/onboarding?filter=documents-pending' },
      { id: 'pa6', label: '3 candidates joining tomorrow', count: 3, link: '/hr/recruitment/candidates?filter=joining-tomorrow' },
    ],

    positionAging: [
      { position: 'Backend Developer', days: 42 },
      { position: 'Sales Manager', days: 31 },
      { position: 'UI Designer', days: 18 },
      { position: 'HR Executive', days: 7 },
    ],

    sourcePerformance: [
      { source: 'LinkedIn', candidates: 220, hires: 3 },
      { source: 'Naukri', candidates: 160, hires: 2 },
      { source: 'Referral', candidates: 35, hires: 7 },
      { source: 'Career Page', candidates: 71, hires: 2 },
    ],

    joiningSoon: [
      { id: 'js1', name: 'Rahul Sharma', position: 'Backend Developer', joiningDate: '2026-08-12', status: 'Documents Pending' },
      { id: 'js2', name: 'Priya Gupta', position: 'HR Executive', joiningDate: '2026-08-13', status: 'Ready to Join' },
    ],

    offerStatus: [
      { status: 'Draft', count: 3 },
      { status: 'Pending Approval', count: 2 },
      { status: 'Sent', count: 8 },
      { status: 'Accepted', count: 5 },
      { status: 'Declined', count: 1 },
      { status: 'Expired', count: 1 },
    ],
  })
})
