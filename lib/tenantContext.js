import { AsyncLocalStorage } from 'async_hooks'

const tenantContextStorage = global._nexahrTenantContextStorage || new AsyncLocalStorage()
global._nexahrTenantContextStorage = tenantContextStorage

export function runRequestContext(fn) {
  return tenantContextStorage.run({}, fn)
}

export function getTenantContext() {
  return tenantContextStorage.getStore() || null
}

export function setTenantContext(context) {
  const store = tenantContextStorage.getStore()
  if (!store) return
  Object.assign(store, context)
}

export function runWithTenantContext(context, fn) {
  const current = tenantContextStorage.getStore() || {}
  return tenantContextStorage.run({ ...current, ...context }, fn)
}
