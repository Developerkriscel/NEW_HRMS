import { redirect } from 'next/navigation'

// middleware.js normally redirects "/" based on role. This server fallback
// keeps the Render root URL useful even if middleware is bypassed.
export default function RootPage() {
  redirect('/login')
}
