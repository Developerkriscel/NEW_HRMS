export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import SalaryStructure from '@/models/SalaryStructure'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const history = await SalaryStructure.find({ employee: params.employeeId, tenantId, deleted: false })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .lean()
  const structure = history.find((item) => item.isActive && item.approvalStatus === 'APPROVED') || null
  if (!structure && history.length === 0) return fail('No salary structure found for this employee', 404)

  return ok({ active: structure, history })
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const employee = await Employee.findOne({ _id: params.employeeId, tenantId, deleted: false })
    .select('firstName lastName employeeCode')
  if (!employee) return fail('Employee not found', 404, 'NOT_FOUND')

  const ctc = Number(body.ctc)
  const basicPercent = Number(body.basicPercent ?? 40)
  const hraPercent = Number(body.hraPercent ?? 20)
  const conveyanceAllowance = Number(body.conveyanceAllowance ?? 1600)
  const medicalAllowance = Number(body.medicalAllowance ?? 1250)
  const pfPercent = Number(body.pfPercent ?? 12)
  const esiPercent = Number(body.esiPercent ?? 0.75)
  const pfEligible = body.pfEligible !== false
  const esiEligible = body.esiEligible !== false
  const ptEligible = body.ptEligible !== false

  if (!Number.isFinite(ctc) || ctc <= 0) return fail('Annual CTC must be greater than 0', 400, 'VALIDATION_ERROR')
  if (basicPercent < 0 || basicPercent > 100) return fail('Basic percent must be between 0 and 100', 400, 'VALIDATION_ERROR')
  if (hraPercent < 0 || hraPercent > 100) return fail('HRA percent must be between 0 and 100', 400, 'VALIDATION_ERROR')
  if ((basicPercent + hraPercent) > 100) return fail('Basic + HRA percent cannot exceed 100', 400, 'VALIDATION_ERROR')
  if ([conveyanceAllowance, medicalAllowance, pfPercent, esiPercent].some((value) => !Number.isFinite(value) || value < 0)) {
    return fail('Salary component values cannot be negative', 400, 'VALIDATION_ERROR')
  }

  const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : new Date()
  if (Number.isNaN(effectiveFrom.getTime())) return fail('Effective from date is invalid', 400, 'VALIDATION_ERROR')

  await SalaryStructure.updateMany(
    { employee: employee._id, tenantId, isActive: true },
    { $set: { isActive: false, effectiveTo: effectiveFrom } }
  )

  const structure = await SalaryStructure.create({
    name: body.name?.trim() || `${employee.firstName} ${employee.lastName} Salary Structure`,
    description: body.description?.trim() || 'Employee payroll salary structure',
    employee: employee._id,
    ctc,
    basicPercent,
    hraPercent,
    conveyanceAllowance,
    medicalAllowance,
    pfPercent,
    esiPercent,
    pfEligible,
    esiEligible,
    ptEligible,
    insuranceGroup: body.insuranceGroup?.trim() || null,
    approvalStatus: 'APPROVED',
    revisionNote: body.revisionNote?.trim() || null,
    effectiveFrom,
    isActive: true,
    tenantId,
    createdBy: session.sub,
  })

  await Employee.updateOne(
    { _id: employee._id, tenantId },
    {
      $set: {
        ctc,
        basicSalary: Math.round((ctc / 12) * (basicPercent / 100)),
        updatedBy: session.sub,
      },
    }
  )

  return ok(structure, 'Salary structure saved')
})
