import mongoose from 'mongoose'
import PlatformOperationRecord from '@/models/PlatformOperationRecord'
import IntegrationLog from '@/models/IntegrationLog'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'
import Tenant from '@/models/Tenant'

export async function buildOperationsSnapshot() {
  const [
    operationRecords,
    failedProvisioning,
    integrationFailures,
    tenantStats,
  ] = await Promise.all([
    PlatformOperationRecord.find({ deleted: false }).sort({ updatedAt: -1 }).limit(200).populate('tenant', 'companyName tenantCode status'),
    TenantProvisioningJob.find({ status: { $in: ['FAILED', 'PARTIALLY_COMPLETED'] } }).sort({ updatedAt: -1 }).limit(20).populate('tenant', 'companyName tenantCode status'),
    IntegrationLog.find({ status: { $in: ['FAILED', 'DEAD_LETTER'] } }).sort({ updatedAt: -1 }).limit(30).populate('provider', 'name key').populate('tenant', 'companyName tenantCode'),
    Tenant.aggregate([
      { $match: { deleted: false } },
      {
        $group: {
          _id: null,
          tenants: { $sum: 1 },
          storageUsedMb: { $sum: '$storageUsedMb' },
          storageLimitMb: { $sum: '$storageLimitMb' },
          readyDatabases: { $sum: { $cond: [{ $eq: ['$databaseStatus', 'READY'] }, 1, 0] } },
          databaseErrors: { $sum: { $cond: [{ $eq: ['$databaseStatus', 'ERROR'] }, 1, 0] } },
        },
      },
    ]),
  ])

  const byType = (type) => operationRecords.filter((record) => record.type === type)
  const databaseState = tenantStats[0] || { tenants: 0, storageUsedMb: 0, storageLimitMb: 0, readyDatabases: 0, databaseErrors: 0 }
  const dbStatus = mongoose.connection.readyState === 1 ? 'HEALTHY' : 'DEGRADED'

  const databaseStatus = [
    {
      name: 'MongoDB',
      status: databaseState.databaseErrors > 0 ? 'DEGRADED' : dbStatus,
      metrics: {
        tenants: databaseState.tenants,
        readyDatabases: databaseState.readyDatabases,
        databaseErrors: databaseState.databaseErrors,
        connectionState: mongoose.connection.readyState,
      },
      updatedAt: new Date(),
    },
    ...byType('DATABASE_STATUS'),
  ]

  const storageStatus = [
    {
      name: 'Tenant document storage',
      status: databaseState.storageUsedMb > databaseState.storageLimitMb ? 'DEGRADED' : 'HEALTHY',
      metrics: {
        usedMb: databaseState.storageUsedMb,
        limitMb: databaseState.storageLimitMb,
        utilizationPct: databaseState.storageLimitMb ? Math.round((databaseState.storageUsedMb / databaseState.storageLimitMb) * 100) : 0,
      },
      updatedAt: new Date(),
    },
    ...byType('STORAGE_STATUS'),
  ]

  const failedJobs = [
    ...byType('BACKGROUND_JOB').filter((job) => job.status === 'FAILED'),
    ...failedProvisioning.map((job) => ({
      _id: job._id,
      type: 'BACKGROUND_JOB',
      name: `Tenant provisioning: ${job.tenant?.companyName || job.payload?.companyName || 'unknown'}`,
      status: job.status,
      severity: job.status === 'PARTIALLY_COMPLETED' ? 'HIGH' : 'MEDIUM',
      attempts: job.attempts,
      errorCode: job.status,
      message: job.error,
      retryable: true,
      updatedAt: job.updatedAt,
    })),
  ]

  return {
    systemHealth: byType('SYSTEM_HEALTH'),
    services: byType('SERVICE'),
    backgroundJobs: byType('BACKGROUND_JOB'),
    jobQueues: byType('JOB_QUEUE'),
    scheduledJobs: byType('SCHEDULED_JOB'),
    failedJobs,
    integrationFailures,
    emailDelivery: byType('EMAIL_DELIVERY'),
    storageStatus,
    databaseStatus,
    backupHistory: byType('BACKUP'),
    restoreTests: byType('RESTORE_TEST'),
    summary: {
      servicesDown: byType('SERVICE').filter((s) => s.status === 'DOWN').length,
      jobsFailed: failedJobs.length,
      queuesPaused: byType('JOB_QUEUE').filter((q) => q.status === 'PAUSED').length,
      integrationFailures: integrationFailures.length,
      backupsFailed: byType('BACKUP').filter((b) => b.status === 'FAILED').length,
      restoreTestsFailed: byType('RESTORE_TEST').filter((r) => r.status === 'FAILED').length,
      databaseStatus: databaseStatus[0].status,
      storageUtilizationPct: storageStatus[0].metrics.utilizationPct,
    },
  }
}

export function assertRetryableJob(job) {
  return job && job.retryable && ['FAILED', 'CANCELLED'].includes(job.status)
}
