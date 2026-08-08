import { redirect } from 'next/navigation'

// Step 1 placed "Open Positions" at this URL as a Coming Soon stub. Step 3
// built the real thing at /hr/recruitment/jobs instead — this just forwards
// anyone who still has the old link/bookmark.
export default function OpenPositionsRedirect() {
  redirect('/hr/recruitment/jobs')
}
