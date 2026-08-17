import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const TENANT_ID = new mongoose.Types.ObjectId('6a6b1b6ba53f75950969aa4c')
const JOB_CODE = 'JOB-2026-0010'

// Mirrors PIPELINE_TEMPLATES.DEFAULT_HIRING in lib/jobConstants.js.
const DEFAULT_HIRING_STAGES = [
  { name: 'Applied', category: 'APPLIED' },
  { name: 'HR Screening', category: 'SCREENING' },
  { name: 'Shortlisted', category: 'SCREENING' },
  { name: 'Interview', category: 'INTERVIEW' },
  { name: 'Selected', category: 'SELECTED' },
  { name: 'Offer', category: 'OFFER' },
  { name: 'Hired', category: 'HIRED' },
]

await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Job = conn.model('jobs', anySchema, 'jobs')
const JobPipelineStage = conn.model('job_pipeline_stages', anySchema, 'job_pipeline_stages')
const Application = conn.model('applications', anySchema, 'applications')

const job = await Job.findOne({ jobCode: JOB_CODE, tenantId: TENANT_ID })
if (!job) throw new Error(`${JOB_CODE} not found`)

const existing = await JobPipelineStage.find({ tenantId: TENANT_ID, jobId: job._id }).lean()
if (existing.length) {
  console.log(`${JOB_CODE} already has ${existing.length} pipeline stage(s) — leaving as is`)
} else {
  const now = new Date()
  const docs = DEFAULT_HIRING_STAGES.map((s, i) => ({
    tenantId: TENANT_ID, jobId: job._id, name: s.name, category: s.category, order: i, isActive: true,
    createdBy: null, updatedBy: null, deleted: false, createdAt: now, updatedAt: now, __v: 0,
  }))
  const inserted = await JobPipelineStage.insertMany(docs)
  console.log(`created ${inserted.length} pipeline stage(s) for ${JOB_CODE}:`)
  inserted.forEach((s) => console.log(`  ${s.order}: ${s.name} (${s.category}) [${s._id}]`))

  const appliedStage = inserted.find((s) => s.name === 'Applied')
  const res = await Application.updateMany(
    { tenantId: TENANT_ID, jobId: job._id, currentStage: null },
    { $set: { currentStage: appliedStage._id, currentStageName: 'Applied', updatedAt: new Date() } }
  )
  console.log(`\nbackfilled currentStage on ${res.modifiedCount} application(s) for this job`)
}

await mongoose.disconnect()
