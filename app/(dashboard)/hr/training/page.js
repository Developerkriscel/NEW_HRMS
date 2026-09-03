'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const TrainingWorkspace = dynamic(
  () => import('@/components/pages/TrainingWorkspace').then((mod) => mod.TrainingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function TrainingPage() {
  return <TrainingWorkspace />
}
