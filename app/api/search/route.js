export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Tenant from '@/models/Tenant'
import Plan from '@/models/Plan'
import Subscription from '@/models/Subscription'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import Branch from '@/models/Branch'
import HelpdeskTicket from '@/models/HelpdeskTicket'
import EmployeeDocument from '@/models/EmployeeDocument'
import Asset from '@/models/Asset'
import AssetRequest from '@/models/AssetRequest'
import Expense from '@/models/Expense'
import TeamRequest from '@/models/TeamRequest'
import Task from '@/models/Task'
import Kra from '@/models/Kra'
import Resignation from '@/models/Resignation'
import TrainingSession from '@/models/TrainingSession'

const TENANT_EMPLOYEE_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER']
const TENANT_ADMIN_ROLES = ['COMPANY_ADMIN']
const HELPDESK_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'IT_ADMIN', 'SUPPORT_AGENT', 'EMPLOYEE']

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function regexFor(query) {
  return new RegExp(escapeRegex(query), 'i')
}

function employeePath(role, employeeId) {
  if (role === 'COMPANY_ADMIN') return `/company/employees/${employeeId}`
  if (role === 'HR_MANAGER') return `/hr/employees/${employeeId}`
  if (role === 'MANAGER') return '/manager/team'
  return '/employee/profile'
}

async function platformResults(query) {
  const rx = regexFor(query)
  const [tenants, plans, subscriptions] = await Promise.all([
    Tenant.find({
      deleted: false,
      $or: [
        { companyName: rx },
        { tenantCode: rx },
        { email: rx },
        { adminEmail: rx },
        { subdomain: rx },
      ],
    }).select('companyName tenantCode email adminEmail status').limit(6).lean(),
    Plan.find({
      deleted: false,
      $or: [
        { name: rx },
        { description: rx },
        { billingCycle: rx },
      ],
    }).select('name billingCycle price active').limit(4).lean(),
    Subscription.find({ deleted: false })
      .populate('tenant', 'companyName tenantCode')
      .populate('plan', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ])

  const subscriptionResults = subscriptions
    .filter((subscription) => {
      const text = [
        subscription.status,
        subscription.tenant?.companyName,
        subscription.tenant?.tenantCode,
        subscription.plan?.name,
      ].filter(Boolean).join(' ')
      return rx.test(text)
    })
    .slice(0, 4)
    .map((subscription) => ({
      title: subscription.tenant?.companyName || 'Subscription',
      description: `${subscription.plan?.name || 'No plan'} - ${subscription.status}`,
      path: `/super-admin/subscriptions/${subscription._id}`,
      type: 'Subscription',
    }))

  return [
    ...tenants.map((tenant) => ({
      title: tenant.companyName,
      description: `${tenant.tenantCode} - ${tenant.adminEmail || tenant.email} - ${tenant.status}`,
      path: `/super-admin/tenants/${tenant._id}`,
      type: 'Company',
    })),
    ...plans.map((plan) => ({
      title: plan.name,
      description: `${plan.billingCycle} - ${plan.active ? 'Active' : 'Inactive'}`,
      path: '/super-admin/plans',
      type: 'Plan',
    })),
    ...subscriptionResults,
  ]
}

async function employeeResults(session, tenantId, query) {
  if (!TENANT_EMPLOYEE_ROLES.includes(session.role)) return []

  const rx = regexFor(query)
  const criteria = {
    tenantId,
    deleted: false,
    $or: [
      { firstName: rx },
      { lastName: rx },
      { email: rx },
      { employeeCode: rx },
      { role: rx },
    ],
  }
  if (session.role === 'MANAGER') criteria.reportingManager = session.userId

  const employees = await Employee.find(criteria)
    .select('firstName lastName email employeeCode role status')
    .sort({ firstName: 1 })
    .limit(8)
    .lean()

  return employees.map((employee) => ({
    title: `${employee.firstName} ${employee.lastName}`,
    description: `${employee.employeeCode || 'No code'} - ${employee.email} - ${employee.status}`,
    path: employeePath(session.role, employee._id),
    type: employee.role || 'Employee',
  }))
}

async function adminStructureResults(session, tenantId, query) {
  if (!TENANT_ADMIN_ROLES.includes(session.role)) return []

  const rx = regexFor(query)
  const [departments, designations, branches] = await Promise.all([
    Department.find({
      tenantId,
      deleted: false,
      $or: [{ name: rx }, { code: rx }, { description: rx }],
    }).select('name code active').limit(4).lean(),
    Designation.find({
      tenantId,
      deleted: false,
      $or: [{ name: rx }, { code: rx }, { grade: rx }],
    }).select('name code grade active').limit(4).lean(),
    Branch.find({
      tenantId,
      deleted: false,
      $or: [{ name: rx }, { city: rx }, { state: rx }, { country: rx }, { phone: rx }],
    }).select('name city state active').limit(4).lean(),
  ])

  return [
    ...departments.map((department) => ({
      title: department.name,
      description: `${department.code || 'Department'} - ${department.active ? 'Active' : 'Inactive'}`,
      path: '/company/departments',
      type: 'Department',
    })),
    ...designations.map((designation) => ({
      title: designation.name,
      description: `${designation.code || designation.grade || 'Designation'} - ${designation.active ? 'Active' : 'Inactive'}`,
      path: '/company/designations',
      type: 'Designation',
    })),
    ...branches.map((branch) => ({
      title: branch.name,
      description: [branch.city, branch.state].filter(Boolean).join(', ') || (branch.active ? 'Active' : 'Inactive'),
      path: '/company/branches',
      type: 'Branch',
    })),
  ]
}

async function helpdeskResults(session, tenantId, query) {
  if (!HELPDESK_ROLES.includes(session.role)) return []

  const rx = regexFor(query)
  const criteria = {
    tenantId,
    $or: [{ subject: rx }, { description: rx }, { category: rx }, { priority: rx }, { status: rx }],
  }
  if (session.role === 'EMPLOYEE') criteria.raisedBy = session.userId

  const tickets = await HelpdeskTicket.find(criteria)
    .select('subject status priority category raisedBy')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()

  const path = session.role === 'EMPLOYEE' ? '/employee/helpdesk' : '/hr/helpdesk'
  return tickets.map((ticket) => ({
    title: ticket.subject,
    description: `${ticket.category || 'Ticket'} - ${ticket.priority} - ${ticket.status}`,
    path,
    type: 'Helpdesk',
  }))
}

async function employeeSelfServiceResults(session, tenantId, query) {
  if (session.role !== 'EMPLOYEE') return []

  const rx = regexFor(query)
  const [
    documents,
    assets,
    assetRequests,
    expenses,
    requests,
    tasks,
    kras,
    resignations,
    trainings,
  ] = await Promise.all([
    EmployeeDocument.find({
      employee: session.userId,
      tenantId,
      deleted: false,
      $or: [{ title: rx }, { category: rx }, { status: rx }, { notes: rx }],
    }).select('title category status').limit(3).lean(),
    Asset.find({
      assignedTo: session.userId,
      tenantId,
      $or: [{ name: rx }, { assetTag: rx }, { category: rx }, { status: rx }],
    }).select('name assetTag status').limit(3).lean(),
    AssetRequest.find({
      requestedFor: session.userId,
      tenantId,
      $or: [{ assetName: rx }, { type: rx }, { status: rx }, { reason: rx }],
    }).select('assetName type status').limit(3).lean(),
    Expense.find({
      employee: session.userId,
      tenantId,
      $or: [{ category: rx }, { description: rx }, { status: rx }, { receiptNote: rx }],
    }).select('category amount status').limit(3).lean(),
    TeamRequest.find({
      employee: session.userId,
      tenantId,
      $or: [{ type: rx }, { reason: rx }, { status: rx }],
    }).select('type reason status').limit(3).lean(),
    Task.find({
      assignedTo: session.userId,
      tenantId,
      $or: [{ title: rx }, { description: rx }, { priority: rx }, { status: rx }],
    }).select('title priority status').limit(3).lean(),
    Kra.find({
      employee: session.userId,
      tenantId,
      $or: [{ title: rx }, { description: rx }, { type: rx }, { status: rx }],
    }).select('title progressPercent status').limit(3).lean(),
    Resignation.find({
      employee: session.userId,
      tenantId,
      $or: [{ reason: rx }, { status: rx }, { managerRecommendation: rx }, { hrDecision: rx }],
    }).select('status reason').limit(3).lean(),
    TrainingSession.find({
      attendees: session.userId,
      tenantId,
      deleted: false,
      $or: [{ title: rx }, { category: rx }, { trainer: rx }, { status: rx }, { notes: rx }],
    }).select('title category status').limit(3).lean(),
  ])

  return [
    ...documents.map((document) => ({
      title: document.title,
      description: `${document.category || 'Document'} - ${document.status}`,
      path: '/employee/documents',
      type: 'Document',
    })),
    ...assets.map((asset) => ({
      title: asset.name,
      description: `${asset.assetTag} - ${asset.status}`,
      path: '/employee/assets',
      type: 'Asset',
    })),
    ...assetRequests.map((request) => ({
      title: request.assetName,
      description: `${request.type} - ${request.status}`,
      path: '/employee/assets',
      type: 'Asset Request',
    })),
    ...expenses.map((expense) => ({
      title: expense.category,
      description: `${expense.amount} - ${expense.status}`,
      path: '/employee/expenses',
      type: 'Expense',
    })),
    ...requests.map((request) => ({
      title: request.type,
      description: `${request.reason || 'Request'} - ${request.status}`,
      path: '/employee/requests',
      type: 'Request',
    })),
    ...tasks.map((task) => ({
      title: task.title,
      description: `${task.priority} - ${task.status}`,
      path: '/employee/tasks',
      type: 'Task',
    })),
    ...kras.map((kra) => ({
      title: kra.title,
      description: `${kra.progressPercent || 0}% - ${kra.status}`,
      path: '/employee/performance',
      type: 'KRA',
    })),
    ...resignations.map((resignation) => ({
      title: 'Resignation',
      description: `${resignation.reason || 'Offboarding'} - ${resignation.status}`,
      path: '/employee/offboarding',
      type: 'Offboarding',
    })),
    ...trainings.map((training) => ({
      title: training.title,
      description: `${training.category || 'Training'} - ${training.status}`,
      path: '/employee/training',
      type: 'Training',
    })),
  ]
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const query = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80)

  if (query.length < 2) return ok([])

  if (session.role === 'SUPER_ADMIN') {
    return ok((await platformResults(query)).slice(0, 12))
  }

  const tenantId = requireTenantId(session)
  const results = await Promise.all([
    employeeResults(session, tenantId, query),
    adminStructureResults(session, tenantId, query),
    helpdeskResults(session, tenantId, query),
    employeeSelfServiceResults(session, tenantId, query),
  ])

  return ok(results.flat().slice(0, 12))
})
