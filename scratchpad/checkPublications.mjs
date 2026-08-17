import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const conn = mongoose.connection.useDb('nexahr_tenant_asd', { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const JobPublication = conn.model('job_publications', anySchema, 'job_publications')
const Job = conn.model('jobs', anySchema, 'jobs')

const openPublicJobs = await Job.find({ status: 'OPEN', visibility: 'PUBLIC', deleted: false }).select('jobCode jobTitle publicTitle applicationDeadline').lean()
console.log('OPEN + PUBLIC jobs:', JSON.stringify(openPublicJobs, null, 2))

const jobIds = openPublicJobs.map(j => j._id)
const pubs = await JobPublication.find({ jobId: { $in: jobIds }, channel: 'CAREER_PAGE' }).select('jobId channel status trackingCode publishedAt').lean()
console.log('Publications:', JSON.stringify(pubs, null, 2))

await mongoose.disconnect()
