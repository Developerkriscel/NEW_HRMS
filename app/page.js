// middleware.js redirects every request to "/" before this ever renders
// (to a role dashboard if authenticated, else /login) — this is just a
// fallback for the rare case middleware is bypassed.
export default function RootPage() {
  return null
}
