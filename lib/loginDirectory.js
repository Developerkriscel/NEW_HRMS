import LoginDirectory from '@/models/LoginDirectory'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function rememberLoginDirectoryEntry(found) {
  if (!found || found.isSuperAdmin || !found.doc?.email || !found.doc?._id || !found.tenant?._id) return
  const email = normalizeEmail(found.doc.email)
  if (!email) return

  await LoginDirectory.updateOne(
    { email, tenantId: found.tenant._id },
    {
      $set: {
        databaseName: found.databaseName || found.tenant.databaseName || null,
        userId: found.doc._id,
        role: found.doc.role || null,
        status: found.doc.status || null,
        deleted: !!found.doc.deleted,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true }
  )
}

export async function findDirectoryTenantId(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const entry = await LoginDirectory.findOne({ email: normalized, deleted: false })
    .select('tenantId')
    .sort({ lastSeenAt: -1, updatedAt: -1 })
    .lean()
  return entry?.tenantId ? String(entry.tenantId) : null
}
