import PlatformConfiguration from '@/models/PlatformConfiguration'

export const PLATFORM_SETTINGS_TYPE = 'REGISTRY'
export const PLATFORM_SETTINGS_KEY = 'platform_settings'

export const DEFAULT_PLATFORM_SETTINGS = {
  organizationDefaults: {
    defaultCountry: 'India',
    defaultTimezone: 'Asia/Kolkata',
    tenantCodePrefix: '',
  },
  provisioning: {
    databasePrefix: 'nexahr_tenant',
  },
}

export function mergePlatformSettings(value = {}) {
  return {
    organizationDefaults: {
      ...DEFAULT_PLATFORM_SETTINGS.organizationDefaults,
      ...(value.organizationDefaults || {}),
    },
    provisioning: {
      ...DEFAULT_PLATFORM_SETTINGS.provisioning,
      ...(value.provisioning || {}),
    },
  }
}

export async function getPlatformSettings() {
  const config = await PlatformConfiguration.findOne({
    type: PLATFORM_SETTINGS_TYPE,
    key: PLATFORM_SETTINGS_KEY,
    status: 'ACTIVE',
  }).sort({ version: -1 }).lean()

  return {
    settings: mergePlatformSettings(config?.value),
    updatedAt: config?.updatedAt || null,
    updatedBy: config?.updatedBy || null,
    version: config?.version || 1,
    config,
  }
}

export function sanitizePlatformSettings(body = {}) {
  const merged = mergePlatformSettings(body)

  return {
    organizationDefaults: {
      defaultCountry: String(merged.organizationDefaults.defaultCountry || DEFAULT_PLATFORM_SETTINGS.organizationDefaults.defaultCountry).trim(),
      defaultTimezone: String(merged.organizationDefaults.defaultTimezone || DEFAULT_PLATFORM_SETTINGS.organizationDefaults.defaultTimezone).trim(),
      tenantCodePrefix: String(merged.organizationDefaults.tenantCodePrefix || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
    },
    provisioning: {
      databasePrefix: String(merged.provisioning.databasePrefix || DEFAULT_PLATFORM_SETTINGS.provisioning.databasePrefix).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    },
  }
}

export function validatePlatformSettings(settings) {
  if (!settings.organizationDefaults.defaultCountry) return 'Default country is required'
  if (!settings.organizationDefaults.defaultTimezone) return 'Default timezone is required'
  if (!settings.provisioning.databasePrefix) return 'Database prefix is required'
  return ''
}
