import { DocumentsWorkspace } from '@/components/pages/DocumentsWorkspace'

export default function ManagerDocumentsPage() {
  return (
    <DocumentsWorkspace
      title="Documents"
      subtitle="View your personal documents"
      employeeMode
    />
  )
}
