import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const TENANT_ID = new mongoose.Types.ObjectId('6a6b1b6ba53f75950969aa4c')
const CREATED_BY = 'hr@asd.test'

const JOB = {
  jobTitle: 'React Developer',
  publicTitle: 'React Developer',
  publicDescription:
    'We are hiring a React Developer to build and maintain user-facing features for our HR platform. ' +
    'You will work closely with the design and backend teams to ship performant, accessible interfaces.',
  jobSummary:
    'We are hiring a React Developer to build and maintain user-facing features for our HR platform.',
  employmentType: 'FULL_TIME',
  workMode: 'ONSITE',
  minExperience: 1,
  maxExperience: 4,
  totalOpenings: 1,
  visibility: 'PUBLIC',
  status: 'OPEN',
}

const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Job = conn.model('jobs', anySchema, 'jobs')
const JobPublication = conn.model('job_publications', anySchema, 'job_publications')
const Employee = conn.model('employees', anySchema, 'employees')
const Department = conn.model('departments', anySchema, 'departments')

const engDept = await Department.findOne({ name: 'Engineering', tenantId: TENANT_ID, deleted: false })
const hrEmployee = await Employee.findOne({ email: CREATED_BY, tenantId: TENANT_ID, deleted: false })

const year = new Date().getFullYear()
const prefix = `JOB-${year}-`
const existing = await Job.find({ tenantId: TENANT_ID, jobCode: { $regex: `^${prefix}` } }).select('jobCode').lean()
let maxNum = 0
for (const j of existing) {
  const m = /(\d+)$/.exec(j.jobCode || '')
  if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
}
const jobCode = `${prefix}${String(maxNum + 1).padStart(4, '0')}`

const now = new Date()
const job = await Job.create({
  jobCode,
  requisitionId: null,
  ...JOB,
  department: engDept?._id || null,
  designation: null,
  filledOpenings: 0,
  createdByEmployee: hrEmployee?._id || null,
  openingDate: now,
  pipelineTemplate: 'DEFAULT_HIRING',
  activityLog: [
    { type: 'CREATED', message: `Created by ${CREATED_BY}`, actorId: hrEmployee?._id || null, actorName: 'Dev HR', createdAt: now },
    { type: 'OPENED', message: `Opened by ${CREATED_BY}`, actorId: hrEmployee?._id || null, actorName: 'Dev HR', createdAt: now },
    { type: 'PUBLISHED', message: 'Published to Company Career Page by Dev HR', actorId: hrEmployee?._id || null, actorName: 'Dev HR', createdAt: now },
  ],
  createdBy: CREATED_BY,
  updatedBy: CREATED_BY,
  deleted: false,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
  __v: 0,
})

function slugify(text) {
  return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'job'
}
const trackingCode = `${slugify(job.publicTitle || job.jobTitle)}-${String(job.jobCode).toLowerCase()}`

await JobPublication.create({
  jobId: job._id,
  channel: 'CAREER_PAGE',
  trackingCode,
  status: 'PUBLISHED',
  publishedAt: now,
  publishedBy: hrEmployee?._id || null,
  metadata: {},
  createdBy: CREATED_BY,
  updatedBy: CREATED_BY,
  deleted: false,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
  __v: 0,
})

console.log(`Created job ${job.jobCode} (${job._id}) — status=${job.status} visibility=${job.visibility}`)
console.log(`Published to CAREER_PAGE — trackingCode=${trackingCode}`)
console.log(`Should now appear at /as/careers`)

await mongoose.disconnect()
