import Notification from '@/models/Notification'
import Tenant from '@/models/Tenant'
import SecurityAlert from '@/models/SecurityAlert'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'
import LeaveRequest from '@/models/LeaveRequest'
import HelpdeskTicket from '@/models/HelpdeskTicket'
import AssetRequest from '@/models/AssetRequest'
import Resignation from '@/models/Resignation'
import Payslip from '@/models/Payslip'
import Announcement from '@/models/Announcement'
import Employee from '@/models/Employee'
import Expense from '@/models/Expense'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export async function createNotification({
  userId = null,
  targetRole = 'ALL',
  tenant = null,
  title,
  message,
  type = 'info',
  category = 'general',
  link = null,
  metadata = {},
}) {
  try {
    return await Notification.create({
      userId: userId ? String(userId) : null,
      targetRole,
      tenant: tenant || null,
      title,
      message,
      type,
      category,
      link,
      metadata,
      read: false,
    })
  } catch (err) {
    console.error('[Notification:create] Error creating notification:', err.message)
    return null
  }
}

export async function getPanelNotifications(session) {
  if (!session) return { notifications: [], unreadCount: 0 }

  const userId = String(session.userId || session.id || '')
  const role = session.role || 'EMPLOYEE'
  const tenantId = session.tenantId ? String(session.tenantId) : null
  const userEmail = session.sub || session.email || ''

  const allItems = []

  // 1. Fetch persistent database notifications for this user / role / tenant
  try {
    const query = {
      $and: [
        {
          $or: [
            { targetRole: 'ALL' },
            { targetRole: role },
            { userId: userId },
            ...(userEmail ? [{ userId: userEmail }] : []),
          ],
        },
      ],
    }

    if (session.isSuperAdmin) {
      query.$and.push({ $or: [{ tenant: null }, { targetRole: 'SUPER_ADMIN' }] })
    } else if (tenantId) {
      query.$and.push({ $or: [{ tenant: tenantId }, { tenant: null }] })
    }

    const dbNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()

    for (const item of dbNotifications) {
      const isRead = item.read || (item.readBy && item.readBy.includes(userId))
      allItems.push({
        id: String(item._id),
        title: item.title,
        message: item.message,
        type: item.type || 'info',
        category: item.category || 'general',
        link: item.link || null,
        read: !!isRead,
        time: item.createdAt || new Date(),
        source: 'db',
      })
    }
  } catch (err) {
    console.warn('[Notification:db] Failed to fetch stored notifications:', err.message)
  }

  // 2. Fetch read markers for live synthetic notifications
  const readSyntheticIds = new Set()
  try {
    const readMarkers = await Notification.find({
      userId,
      'metadata.synthetic': true,
    })
      .select('metadata.syntheticId')
      .limit(100)
      .lean()

    for (const marker of readMarkers) {
      if (marker.metadata?.syntheticId) {
        readSyntheticIds.add(marker.metadata.syntheticId)
      }
    }
  } catch {
    // Non-fatal
  }

  // 3. Synthesize live operational notifications according to Panel & Role
  try {
    if (session.isSuperAdmin || role === 'SUPER_ADMIN') {
      // Super Admin panel notifications
      const [tenants, alerts, jobs] = await Promise.allSettled([
        Tenant.find({ deleted: false }).select('companyName tenantCode status createdAt').sort({ createdAt: -1 }).limit(4).lean(),
        SecurityAlert.find({ status: 'OPEN' }).select('category title severity occurredAt createdAt').sort({ occurredAt: -1 }).limit(3).lean(),
        TenantProvisioningJob.find({ status: { $in: ['FAILED', 'PENDING'] } }).select('status payload.companyName createdAt').sort({ createdAt: -1 }).limit(3).lean(),
      ])

      if (tenants.status === 'fulfilled' && tenants.value) {
        for (const t of tenants.value) {
          const syncId = `live_tenant_${t._id}`
          allItems.push({
            id: syncId,
            title: `Company: ${t.companyName || t.name || 'New Company'}`,
            message: `Status: ${t.status || 'ACTIVE'} | Code: ${t.tenantCode || 'TENANT'}`,
            type: 'info',
            category: 'system',
            link: '/super-admin/tenants',
            read: readSyntheticIds.has(syncId),
            time: t.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (alerts.status === 'fulfilled' && alerts.value) {
        for (const a of alerts.value) {
          const syncId = `live_alert_${a._id}`
          allItems.push({
            id: syncId,
            title: `Security Alert: ${a.category || 'Warning'}`,
            message: a.title || 'Security incident flagged',
            type: a.severity === 'CRITICAL' ? 'error' : 'warning',
            category: 'security',
            link: '/super-admin/audit-logs',
            read: readSyntheticIds.has(syncId),
            time: a.occurredAt || a.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (jobs.status === 'fulfilled' && jobs.value) {
        for (const j of jobs.value) {
          const syncId = `live_job_${j._id}`
          allItems.push({
            id: syncId,
            title: `Provisioning ${j.status}`,
            message: `Job for ${j.payload?.companyName || 'tenant'} requires review`,
            type: j.status === 'FAILED' ? 'error' : 'warning',
            category: 'system',
            link: '/super-admin/tenants',
            read: readSyntheticIds.has(syncId),
            time: j.createdAt || new Date(),
            source: 'live',
          })
        }
      }
    } else if (role === 'COMPANY_ADMIN' || role === 'HR_MANAGER') {
      // HR & Company Admin panel notifications
      const [leaves, tickets, assetReqs, resignations, announcements] = await Promise.allSettled([
        LeaveRequest.find({ status: 'PENDING' }).populate('employee', 'firstName lastName').sort({ createdAt: -1 }).limit(5).lean(),
        HelpdeskTicket.find({ status: { $in: ['OPEN', 'ESCALATED'] } }).populate('raisedBy', 'firstName lastName').sort({ createdAt: -1 }).limit(4).lean(),
        AssetRequest.find({ status: 'PENDING' }).populate('requestedFor', 'firstName lastName').sort({ createdAt: -1 }).limit(3).lean(),
        Resignation.find({ status: { $in: ['SUBMITTED', 'FORWARDED_TO_HR'] } }).populate('employee', 'firstName lastName').sort({ createdAt: -1 }).limit(3).lean(),
        Announcement.find({ scope: 'COMPANY' }).sort({ createdAt: -1 }).limit(2).lean(),
      ])

      if (leaves.status === 'fulfilled' && leaves.value) {
        for (const lr of leaves.value) {
          const syncId = `live_hr_leave_${lr._id}`
          const name = lr.employee ? `${lr.employee.firstName} ${lr.employee.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: 'Leave Request Pending',
            message: `${name} requested ${lr.numberOfDays || 1} day(s) leave`,
            type: 'warning',
            category: 'leave',
            link: '/hr/leave',
            read: readSyntheticIds.has(syncId),
            time: lr.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (tickets.status === 'fulfilled' && tickets.value) {
        for (const t of tickets.value) {
          const syncId = `live_hr_ticket_${t._id}`
          const name = t.raisedBy ? `${t.raisedBy.firstName} ${t.raisedBy.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: `Helpdesk Ticket: ${t.subject || 'New Ticket'}`,
            message: `From ${name} (Priority: ${t.priority || 'MEDIUM'})`,
            type: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'warning' : 'info',
            category: 'helpdesk',
            link: '/hr/helpdesk',
            read: readSyntheticIds.has(syncId),
            time: t.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (assetReqs.status === 'fulfilled' && assetReqs.value) {
        for (const ar of assetReqs.value) {
          const syncId = `live_hr_asset_${ar._id}`
          const name = ar.requestedFor ? `${ar.requestedFor.firstName} ${ar.requestedFor.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: 'Asset Allocation Request',
            message: `${name} requested ${ar.assetName || 'an asset'}`,
            type: 'info',
            category: 'asset',
            link: '/hr/assets',
            read: readSyntheticIds.has(syncId),
            time: ar.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (resignations.status === 'fulfilled' && resignations.value) {
        for (const r of resignations.value) {
          const syncId = `live_hr_resig_${r._id}`
          const name = r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: 'Resignation Notice',
            message: `${name} submitted resignation request`,
            type: 'warning',
            category: 'document',
            link: '/hr/offboarding',
            read: readSyntheticIds.has(syncId),
            time: r.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (announcements.status === 'fulfilled' && announcements.value) {
        for (const ann of announcements.value) {
          const syncId = `live_ann_${ann._id}`
          allItems.push({
            id: syncId,
            title: `Company Announcement: ${ann.title}`,
            message: ann.body ? ann.body.slice(0, 80) + '...' : 'New announcement posted',
            type: 'info',
            category: 'announcement',
            link: '/company/dashboard',
            read: readSyntheticIds.has(syncId),
            time: ann.createdAt || new Date(),
            source: 'live',
          })
        }
      }
    } else if (role === 'MANAGER') {
      // Manager panel notifications
      const managerEmp = await Employee.findOne({
        $or: [{ email: userEmail }, { _id: userId.length === 24 ? userId : null }],
      }).lean()

      if (managerEmp) {
        const directReports = await Employee.find({ reportingManager: managerEmp._id })
          .select('_id firstName lastName')
          .lean()
        const reportIds = directReports.map((r) => r._id)

        const [teamLeaves, teamAnnouncements] = await Promise.allSettled([
          reportIds.length > 0
            ? LeaveRequest.find({ employee: { $in: reportIds }, status: 'PENDING' })
                .populate('employee', 'firstName lastName')
                .limit(5)
                .lean()
            : Promise.resolve([]),
          Announcement.find({
            $or: [{ scope: 'COMPANY' }, { scope: 'TEAM', team: managerEmp._id }],
          })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean(),
        ])

        if (teamLeaves.status === 'fulfilled' && teamLeaves.value) {
          for (const lr of teamLeaves.value) {
            const syncId = `live_mgr_leave_${lr._id}`
            const name = lr.employee ? `${lr.employee.firstName} ${lr.employee.lastName}` : 'Team Member'
            allItems.push({
              id: syncId,
              title: 'Team Leave Approval Needed',
              message: `${name} requested ${lr.numberOfDays || 1} day(s) leave`,
              type: 'warning',
              category: 'leave',
              link: '/manager/leave-approvals',
              read: readSyntheticIds.has(syncId),
              time: lr.createdAt || new Date(),
              source: 'live',
            })
          }
        }

        if (teamAnnouncements.status === 'fulfilled' && teamAnnouncements.value) {
          for (const ann of teamAnnouncements.value) {
            const syncId = `live_ann_${ann._id}`
            allItems.push({
              id: syncId,
              title: `Announcement: ${ann.title}`,
              message: ann.body ? ann.body.slice(0, 80) + '...' : 'Notice for team',
              type: 'info',
              category: 'announcement',
              link: '/manager/dashboard',
              read: readSyntheticIds.has(syncId),
              time: ann.createdAt || new Date(),
              source: 'live',
            })
          }
        }
      }
    } else if (role === 'FINANCE') {
      // Finance panel notifications
      const [pendingPayslips, pendingExpenses] = await Promise.allSettled([
        Payslip.find({ status: { $in: ['DRAFT', 'REVIEW', 'APPROVED'] } }).limit(4).lean(),
        Expense.find({ status: 'PENDING' }).populate('employee', 'firstName lastName').limit(4).lean(),
      ])

      if (pendingPayslips.status === 'fulfilled' && pendingPayslips.value?.length > 0) {
        const syncId = `live_fin_payslips_${pendingPayslips.value[0]._id}`
        allItems.push({
          id: syncId,
          title: 'Payroll Finalization Required',
          message: `${pendingPayslips.value.length} payslip records pending action`,
          type: 'warning',
          category: 'payroll',
          link: '/hr/payroll',
          read: readSyntheticIds.has(syncId),
          time: new Date(),
          source: 'live',
        })
      }

      if (pendingExpenses.status === 'fulfilled' && pendingExpenses.value) {
        for (const exp of pendingExpenses.value) {
          const syncId = `live_fin_exp_${exp._id}`
          const name = exp.employee ? `${exp.employee.firstName} ${exp.employee.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: 'Expense Claim Pending',
            message: `₹${exp.amount || 0} claim submitted by ${name}`,
            type: 'info',
            category: 'payroll',
            link: '/hr/payroll',
            read: readSyntheticIds.has(syncId),
            time: exp.createdAt || new Date(),
            source: 'live',
          })
        }
      }
    } else if (role === 'IT_ADMIN') {
      // IT Admin panel notifications
      const [itTickets, pendingAssets] = await Promise.allSettled([
        HelpdeskTicket.find({ status: { $in: ['OPEN', 'ESCALATED'] } }).populate('raisedBy', 'firstName lastName').limit(5).lean(),
        AssetRequest.find({ status: 'PENDING' }).populate('requestedFor', 'firstName lastName').limit(4).lean(),
      ])

      if (itTickets.status === 'fulfilled' && itTickets.value) {
        for (const t of itTickets.value) {
          const syncId = `live_it_ticket_${t._id}`
          allItems.push({
            id: syncId,
            title: `IT Support: ${t.subject || 'Ticket'}`,
            message: `Priority: ${t.priority || 'MEDIUM'}`,
            type: 'warning',
            category: 'helpdesk',
            link: '/hr/helpdesk',
            read: readSyntheticIds.has(syncId),
            time: t.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (pendingAssets.status === 'fulfilled' && pendingAssets.value) {
        for (const ar of pendingAssets.value) {
          const syncId = `live_it_asset_${ar._id}`
          const name = ar.requestedFor ? `${ar.requestedFor.firstName} ${ar.requestedFor.lastName}` : 'Employee'
          allItems.push({
            id: syncId,
            title: 'Asset Allocation Pending',
            message: `${ar.assetName} requested for ${name}`,
            type: 'info',
            category: 'asset',
            link: '/hr/assets',
            read: readSyntheticIds.has(syncId),
            time: ar.createdAt || new Date(),
            source: 'live',
          })
        }
      }
    } else {
      // Default: EMPLOYEE panel notifications
      const emp = await Employee.findOne({
        $or: [{ email: userEmail }, { _id: userId.length === 24 ? userId : null }],
      }).lean()

      const empId = emp?._id

      const [payslips, myLeaves, myTickets, announcements] = await Promise.allSettled([
        empId ? Payslip.find({ employee: empId }).sort({ year: -1, month: -1 }).limit(2).lean() : Promise.resolve([]),
        empId ? LeaveRequest.find({ employee: empId }).sort({ updatedAt: -1 }).limit(3).lean() : Promise.resolve([]),
        empId ? HelpdeskTicket.find({ raisedBy: empId }).sort({ updatedAt: -1 }).limit(2).lean() : Promise.resolve([]),
        Announcement.find({ scope: 'COMPANY' }).sort({ createdAt: -1 }).limit(2).lean(),
      ])

      if (payslips.status === 'fulfilled' && payslips.value) {
        for (const p of payslips.value) {
          const syncId = `live_emp_payslip_${p._id}`
          const monthName = MONTH_NAMES[(p.month || 1) - 1] || 'Month'
          allItems.push({
            id: syncId,
            title: 'Payslip Available',
            message: `Your payslip for ${monthName} ${p.year} is ${p.status?.toLowerCase() || 'ready'}`,
            type: 'success',
            category: 'payroll',
            link: '/employee/payslips',
            read: readSyntheticIds.has(syncId),
            time: p.updatedAt || p.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (myLeaves.status === 'fulfilled' && myLeaves.value) {
        for (const lr of myLeaves.value) {
          const syncId = `live_emp_leave_${lr._id}_${lr.status}`
          const isApproved = lr.status === 'APPROVED'
          const isRejected = lr.status === 'REJECTED'
          allItems.push({
            id: syncId,
            title: `Leave ${lr.status}`,
            message: `Leave for ${new Date(lr.startDate).toLocaleDateString()} has been ${lr.status.toLowerCase()}`,
            type: isApproved ? 'success' : isRejected ? 'error' : 'info',
            category: 'leave',
            link: '/employee/leave',
            read: readSyntheticIds.has(syncId),
            time: lr.updatedAt || lr.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (myTickets.status === 'fulfilled' && myTickets.value) {
        for (const t of myTickets.value) {
          const syncId = `live_emp_ticket_${t._id}_${t.status}`
          allItems.push({
            id: syncId,
            title: `Ticket: ${t.subject || 'Ticket'}`,
            message: `Status is now ${t.status}`,
            type: t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'success' : 'info',
            category: 'helpdesk',
            link: '/employee/helpdesk',
            read: readSyntheticIds.has(syncId),
            time: t.updatedAt || t.createdAt || new Date(),
            source: 'live',
          })
        }
      }

      if (announcements.status === 'fulfilled' && announcements.value) {
        for (const ann of announcements.value) {
          const syncId = `live_ann_${ann._id}`
          allItems.push({
            id: syncId,
            title: `Announcement: ${ann.title}`,
            message: ann.body ? ann.body.slice(0, 80) + '...' : 'Company notice',
            type: 'info',
            category: 'announcement',
            link: '/employee/dashboard',
            read: readSyntheticIds.has(syncId),
            time: ann.createdAt || new Date(),
            source: 'live',
          })
        }
      }
    }
  } catch (err) {
    console.warn('[Notification:synthetic] Failed to synthesize notifications:', err.message)
  }

  // Deduplicate and sort all notifications newest first
  const seenIds = new Set()
  const uniqueItems = []
  for (const item of allItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id)
      uniqueItems.push(item)
    }
  }

  uniqueItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  // If no notifications exist yet for the panel, add helpful panel starter notifications
  if (uniqueItems.length === 0) {
    if (session.isSuperAdmin || role === 'SUPER_ADMIN') {
      uniqueItems.push({
        id: 'starter_sa_1',
        title: 'Platform Ready',
        message: 'All multi-tenant services and security monitors are operating normally.',
        type: 'info',
        category: 'system',
        link: '/super-admin/dashboard',
        read: readSyntheticIds.has('starter_sa_1'),
        time: new Date(),
        source: 'starter',
      })
    } else if (role === 'COMPANY_ADMIN' || role === 'HR_MANAGER') {
      uniqueItems.push({
        id: 'starter_hr_1',
        title: 'HR Panel Active',
        message: 'No pending leave requests or tickets awaiting your review.',
        type: 'info',
        category: 'general',
        link: '/hr/dashboard',
        read: readSyntheticIds.has('starter_hr_1'),
        time: new Date(),
        source: 'starter',
      })
    } else if (role === 'MANAGER') {
      uniqueItems.push({
        id: 'starter_mgr_1',
        title: 'Team In Sync',
        message: 'All team member requests and attendance records are up to date.',
        type: 'info',
        category: 'general',
        link: '/manager/dashboard',
        read: readSyntheticIds.has('starter_mgr_1'),
        time: new Date(),
        source: 'starter',
      })
    } else {
      uniqueItems.push({
        id: 'starter_emp_1',
        title: 'Welcome to NexaHR',
        message: 'Your employee portal is active. View your profile, attendance, and leaves anytime.',
        type: 'info',
        category: 'general',
        link: '/employee/dashboard',
        read: readSyntheticIds.has('starter_emp_1'),
        time: new Date(),
        source: 'starter',
      })
    }
  }

  const unreadCount = uniqueItems.filter((item) => !item.read).length

  return {
    notifications: uniqueItems,
    unreadCount,
  }
}
