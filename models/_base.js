import mongoose from 'mongoose'
import { getTenantContext } from '@/lib/tenantContext'

const modelSchemas = global._nexahrModelSchemas || new Map()
const tenantDatabaseModelNames = global._nexahrTenantDatabaseModelNames || new Set()
const tenantAwareModelProxies = global._nexahrTenantAwareModelProxies || new Map()

global._nexahrModelSchemas = modelSchemas
global._nexahrTenantDatabaseModelNames = tenantDatabaseModelNames
global._nexahrTenantAwareModelProxies = tenantAwareModelProxies

// Shared fields mirroring the old JPA BaseEntity (createdAt/updatedAt via
// timestamps, soft-delete flag, createdBy/updatedBy audit strings).
export const baseFields = {
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
  deleted: { type: Boolean, default: false },
}

// Shared fields mirroring the old JPA TenantBaseEntity — every tenant-scoped
// collection carries this so queries can be scoped with { tenantId }.
export const tenantFields = {
  ...baseFields,
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
}

export function model(name, schema) {
  modelSchemas.set(name, schema)

  const tenantScoped = !!schema.path('tenantId')
  if (tenantScoped || name === 'Permission') {
    tenantDatabaseModelNames.add(name)
  }

  const baseModel = mongoose.models[name] || mongoose.model(name, schema)
  if (!tenantScoped) return baseModel

  if (tenantAwareModelProxies.has(name)) return tenantAwareModelProxies.get(name)

  const proxy = new Proxy(baseModel, {
    get(target, prop) {
      const activeModel = getActiveTenantModel(name, target)
      const value = Reflect.get(activeModel, prop, activeModel)
      return typeof value === 'function' ? value.bind(activeModel) : value
    },
    apply(target, thisArg, args) {
      const activeModel = getActiveTenantModel(name, target)
      return Reflect.apply(activeModel, thisArg, args)
    },
    construct(target, args) {
      const activeModel = getActiveTenantModel(name, target)
      return Reflect.construct(activeModel, args)
    },
  })

  tenantAwareModelProxies.set(name, proxy)
  return proxy
}

function getActiveTenantModel(name, fallbackModel) {
  const context = getTenantContext()
  if (!context?.databaseName) return fallbackModel

  const conn = getDatabaseConnection(context.databaseName)
  ensureModelsOnConnection(conn)
  return conn.models[name] || fallbackModel
}

export function getDatabaseConnection(databaseName) {
  if (!databaseName) return mongoose.connection
  return mongoose.connection.useDb(databaseName, { useCache: true })
}

export function ensureModelsOnConnection(conn) {
  for (const name of tenantDatabaseModelNames) {
    if (!conn.models[name] && modelSchemas.has(name)) {
      conn.model(name, modelSchemas.get(name))
    }
  }
}

export function getRegisteredTenantModelNames() {
  return Array.from(tenantDatabaseModelNames)
}
