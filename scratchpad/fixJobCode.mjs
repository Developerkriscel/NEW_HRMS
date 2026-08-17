import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const OLD_CODE = 'JOB-2026-1786210803584'
const NEW_CODE = 'JOB-2026-0010'

await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI)
const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Job = conn.model('jobs', anySchema, 'jobs')
const JobPublication = conn.model('job_publications', anySchema, 'job_publications')

const job = await Job.findOne({ jobCode: OLD_CODE })
if (!job) throw new Error(`job ${OLD_CODE} not found`)

function slugify(text) {
  return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'job'
}
const newTrackingCode = `${slugify(job.publicTitle || job.jobTitle)}-${NEW_CODE.toLowerCase()}`

await Job.updateOne({ _id: job._id }, { $set: { jobCode: NEW_CODE, updatedAt: new Date() } })
await JobPublication.updateOne({ jobId: job._id, channel: 'CAREER_PAGE' }, { $set: { trackingCode: newTrackingCode, updatedAt: new Date() } })

console.log(`renamed ${OLD_CODE} -> ${NEW_CODE}`)
console.log(`new trackingCode: ${newTrackingCode}`)

await mongoose.disconnect()
