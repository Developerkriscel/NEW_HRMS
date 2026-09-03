'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const ProfileWorkspace = dynamic(
  () => import('@/components/pages/ProfileWorkspace').then((mod) => mod.ProfileWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function HRProfilePage() {
  return <ProfileWorkspace />
}
