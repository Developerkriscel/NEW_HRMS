import Module from '@/models/Module'
import PlanModule from '@/models/PlanModule'
import { ApiError } from '@/lib/auth'

// Validates that enabling a set of module keys doesn't leave a dependency
// unsatisfied — e.g. enabling "payroll" without "core_hr" already on. Checks
// against the *resulting* enabled set (existing + newly enabled, minus
// newly disabled), not just the delta, so disabling a dependency that
// something else still needs is caught too.
export async function validateModuleDependencies(resultingEnabledKeys) {
  const enabled = new Set(resultingEnabledKeys)
  const modules = await Module.find({ key: { $in: Array.from(enabled) }, deleted: false })

  const missing = []
  for (const mod of modules) {
    for (const dep of mod.dependencies || []) {
      if (!enabled.has(dep)) missing.push({ module: mod.key, requires: dep })
    }
  }

  if (missing.length) {
    const detail = missing.map((m) => `${m.module} requires ${m.requires}`).join('; ')
    throw new ApiError(400, `Module dependency not satisfied: ${detail}`, 'MODULE_DEPENDENCY_UNMET')
  }
}

export async function getPlanModuleMap(planId) {
  const rows = await PlanModule.find({ plan: planId }).populate('module')
  const map = {}
  for (const row of rows) {
    if (row.module) map[row.module.key] = row.availability
  }
  return map
}

// A tenant may only enable a module the plan makes available at all
// (INCLUDED or ADD_ON) — never one marked UNAVAILABLE for that plan.
export async function assertModulesAllowedForPlan(planId, keysToEnable) {
  if (!planId || !keysToEnable.length) return
  const map = await getPlanModuleMap(planId)
  const disallowed = keysToEnable.filter((key) => map[key] === 'UNAVAILABLE')
  if (disallowed.length) {
    throw new ApiError(400, `These modules are not available on this plan: ${disallowed.join(', ')}`, 'MODULE_NOT_ON_PLAN')
  }
}
