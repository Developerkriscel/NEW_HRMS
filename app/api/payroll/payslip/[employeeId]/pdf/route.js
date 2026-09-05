export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'
import Tenant from '@/models/Tenant'
import { generatePayslipPdfBuffer } from '@/lib/payslipPdfGenerator'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  
  const payslip = await Payslip.findOne({ _id: params.employeeId, tenantId, deleted: false }).populate('employee', 'firstName lastName employeeCode')
  if (!payslip) return fail('Payslip not found', 404)

  if (session.role === 'EMPLOYEE' && String(payslip.employee._id) !== session.userId) {
    return fail('You can only download your own payslip', 403)
  }
  if (session.role === 'EMPLOYEE' && !['FINALIZED', 'PAID'].includes(payslip.status)) {
    return fail('Payslip is not available yet', 403)
  }

  const tenant = await Tenant.findById(tenantId)

  const pdfBuffer = await generatePayslipPdfBuffer(payslip, tenant)
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const filename = `Payslip_${monthNames[payslip.month - 1]}_${payslip.year}.pdf`
  
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
})
