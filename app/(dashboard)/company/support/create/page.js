import { redirect } from 'next/navigation'

export default function CreateSupportTicketPage() {
  redirect('/company/support?create=1')
}
