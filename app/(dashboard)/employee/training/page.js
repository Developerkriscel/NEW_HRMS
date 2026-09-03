'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeeTrainingWorkspace = dynamic(
  () => import('@/components/pages/EmployeeTrainingWorkspace').then((mod) => mod.EmployeeTrainingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function EmployeeTrainingPage() {
  return <EmployeeTrainingWorkspace />
}
