import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const conn = mongoose.connection.useDb('nexahr_tenant_asd', { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Candidate = conn.model('candidates', anySchema, 'candidates')
const Application = conn.model('applications', anySchema, 'applications')
const ApplicationAnswer = conn.model('application_answers', anySchema, 'application_answers')
const Job = conn.model('jobs', anySchema, 'jobs')

const candidate = await Candidate.findOne({ candidateCode: 'CAN-2026-0016' }).lean()
console.log('CANDIDATE:', JSON.stringify(candidate, null, 2))

const application = await Application.findOne({ applicationCode: 'APP-2026-0016' }).lean()
console.log('APPLICATION:', JSON.stringify(application, null, 2))

const answers = await ApplicationAnswer.find({ applicationId: application?._id }).lean()
console.log('ANSWERS:', JSON.stringify(answers, null, 2))

const job = await Job.findById('6a773928b23b69a5e76c35c0').select('activityLog').lean()
console.log('JOB ACTIVITY LOG (last 3):', JSON.stringify(job.activityLog.slice(-3), null, 2))

await mongoose.disconnect()
