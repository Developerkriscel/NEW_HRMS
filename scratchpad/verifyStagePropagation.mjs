// Logs in as hr@asd.test through the real /api/auth/login endpoint (no DB
// bypass), moves the React Developer application to Interview through the
// real /move-stage endpoint, then re-reads it back through three different
// read paths (application detail, candidates list, pipeline board) to prove
// they all agree — same code paths a browser session would hit.
const BASE = 'http://localhost:3000'
const APPLICATION_ID = '6a818b5ffc6e7d441dcb7ecb' // APP-2026-0018, Ravi Testcandidate on React Developer
const JOB_ID = '6a8189beaa6e6b71e6e2e69d' // JOB-2026-0010
const INTERVIEW_STAGE_ID = '6a818ff8dd6731219b47030b' // "Interview" stage seeded earlier

function extractCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  return raw.map((c) => c.split(';')[0]).join('; ')
}

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'hr@asd.test', password: 'Nexahr@1234' }),
})
if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status} ${await loginRes.text()}`)
const cookie = extractCookies(loginRes)
console.log('logged in as hr@asd.test')

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...opts.headers } })
  const body = await res.json()
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`)
  return body.data
}

const before = await api(`/api/recruitment/applications/${APPLICATION_ID}`)
console.log(`\nBEFORE move — application detail stage: "${before.currentStageName}"`)

const moved = await api(`/api/recruitment/applications/${APPLICATION_ID}/move-stage`, {
  method: 'POST',
  body: JSON.stringify({ stageId: INTERVIEW_STAGE_ID, comment: 'Verification: propagation check' }),
})
console.log(`move-stage response — new stage: "${moved.currentStageName}"`)

const afterDetail = await api(`/api/recruitment/applications/${APPLICATION_ID}`)
console.log(`\nAFTER — application detail (GET /applications/[id]): "${afterDetail.currentStageName}"`)

const candidateList = await api(`/api/recruitment/candidates?jobId=${JOB_ID}`)
const listRow = (candidateList.content || candidateList).find((r) => r.applicationId === APPLICATION_ID || r._id === APPLICATION_ID)
console.log(`AFTER — candidates list row stage: "${listRow?.stage}"`)

const board = await api(`/api/recruitment/pipeline?jobId=${JOB_ID}`)
const stageWithCard = board.stages.find((s) => s.cards.some((c) => c.applicationId === APPLICATION_ID))
console.log(`AFTER — pipeline board column containing this candidate: "${stageWithCard?.name}"`)

const consistent = afterDetail.currentStageName === 'Interview' && listRow?.stage === 'Interview' && stageWithCard?.name === 'Interview'
console.log(`\n${consistent ? 'CONSISTENT — all three views agree' : 'MISMATCH — see values above'}`)
