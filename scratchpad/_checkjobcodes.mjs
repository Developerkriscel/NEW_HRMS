import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI)
const anySchema = new mongoose.Schema({}, { strict: false })
const conn = mongoose.connection.useDb('nexahr_tenant_asd', { useCache: true })
const Job = conn.model('jobs', anySchema, 'jobs')
const jobs = await Job.find({}).select('jobCode jobTitle status visibility').sort({ createdAt: 1 }).lean()
jobs.forEach(j => console.log(j.jobCode, '|', j.jobTitle, '|', j.status, '|', j.visibility))
