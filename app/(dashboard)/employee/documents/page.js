'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const DocumentsWorkspace = dynamic(
  () => import('@/components/pages/DocumentsWorkspace').then((mod) => mod.DocumentsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function EmployeeDocumentsPage() {
  return <DocumentsWorkspace title="Documents" subtitle="Upload and track your documents" employeeMode />
}
