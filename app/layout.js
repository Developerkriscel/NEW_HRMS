import './globals.css'
import { ChunkRecovery } from '@/components/common/ChunkRecovery'

export const metadata = {
  title: 'NexaHR — Enterprise HRMS',
  description: 'NexaHR — Enterprise SaaS HRMS Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChunkRecovery />
        {children}
      </body>
    </html>
  )
}
