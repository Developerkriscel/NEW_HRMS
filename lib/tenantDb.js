import mongoose from 'mongoose'
import Tenant from '@/models/Tenant'
import Permission from '@/models/Permission'
import { ensureModelsOnConnection, getDatabaseConnection, getRegisteredTenantModelNames } from '@/models/_base'
import { ensureTenantModelSchemasLoaded } from '@/lib/tenantModels'
import { runWithTenantContext, setTenantContext } from '@/lib/tenantContext'

const DB_PREFIX = process.env.TENANT_DB_PREFIX || 'nexahr_tenant'

function sanitizeDbPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildTenantDatabaseName(tenantCode, tenantId) {
  const code = sanitizeDbPart(tenantCode) || `tenant_${String(tenantId || new mongoose.Types.ObjectId()).slice(-8)}`
  return `${sanitizeDbPart(DB_PREFIX) || 'nexahr_tenant'}_${code}`.slice(0, 63)
}

export async function resolveTenantDatabase(tenantId) {
  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false })
  if (!tenant) {
    const err = new Error('Tenant not found')
    err.status = 404
    err.errorCode = 'TENANT_NOT_FOUND'
    throw err
  }

  if (!tenant.databaseName) {
    tenant.databaseName = buildTenantDatabaseName(tenant.tenantCode, tenant._id)
    tenant.databaseStatus = tenant.databaseStatus || 'PENDING'
    await tenant.save()
  }

  return {
    tenantId: String(tenant._id),
    databaseName: tenant.databaseName,
    databaseStatus: tenant.databaseStatus,
    tenant,
  }
}

export async function applyTenantContextForSession(session) {
  if (!session?.tenantId) return null
  const resolved = await resolveTenantDatabase(session.tenantId)
  setTenantContext({
    tenantId: resolved.tenantId,
    databaseName: resolved.databaseName,
  })
  return resolved
}

export function getTenantModelForDatabase(modelName, databaseName) {
  ensureTenantModelSchemasLoaded()
  const conn = getDatabaseConnection(databaseName)
  ensureModelsOnConnection(conn)
  return conn.models[modelName]
}

export async function provisionTenantDatabase(tenant, { createdBy } = {}) {
  ensureTenantModelSchemasLoaded()

  if (!tenant.databaseName) {
    tenant.databaseName = buildTenantDatabaseName(tenant.tenantCode, tenant._id)
  }

  tenant.databaseStatus = 'PROVISIONING'
  tenant.databaseError = null
  tenant.databaseLastCheckedAt = new Date()
  tenant.updatedBy = createdBy || tenant.updatedBy
  await tenant.save()

  try {
    const conn = getDatabaseConnection(tenant.databaseName)
    ensureModelsOnConnection(conn)

    const modelNames = getRegisteredTenantModelNames().filter((name) => name !== 'Permission')
    for (const name of modelNames) {
      const Model = conn.models[name]
      if (Model) await Model.createCollection().catch((err) => {
        if (err?.codeName !== 'NamespaceExists' && err?.code !== 48) throw err
      })
    }

    for (const name of modelNames) {
      const Model = conn.models[name]
      if (Model) await Model.syncIndexes()
    }

    const tenantPermission = conn.models.Permission
    if (tenantPermission) {
      const permissions = await Permission.find({ deleted: false }).lean()
      for (const permission of permissions) {
        await tenantPermission.updateOne(
          { name: permission.name },
          {
            $setOnInsert: {
              name: permission.name,
              description: permission.description,
              module: permission.module,
              deleted: false,
              createdBy: createdBy || null,
            },
          },
          { upsert: true }
        )
      }
    }

    tenant.databaseStatus = 'READY'
    tenant.databaseProvisionedAt = tenant.databaseProvisionedAt || new Date()
    tenant.databaseLastCheckedAt = new Date()
    tenant.databaseError = null
    await tenant.save()
    return tenant
  } catch (err) {
    tenant.databaseStatus = 'ERROR'
    tenant.databaseError = err.message
    tenant.databaseLastCheckedAt = new Date()
    await tenant.save()
    throw err
  }
}

export async function runForTenant(tenant, fn) {
  if (!tenant.databaseName) {
    tenant.databaseName = buildTenantDatabaseName(tenant.tenantCode, tenant._id)
    await tenant.save()
  }
  return runWithTenantContext(
    { tenantId: String(tenant._id), databaseName: tenant.databaseName },
    fn
  )
}
