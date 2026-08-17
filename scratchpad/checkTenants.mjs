import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }))
const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs')
const tenants = await Tenant.find({ deleted: { $ne: true } }).select('companyName subdomain tenantCode status').lean()
console.log('TENANTS:', JSON.stringify(tenants, null, 2))
const jobs = await Job.find({}).select('jobTitle jobCode status visibility tenantId').limit(20).lean()
console.log('JOBS:', JSON.stringify(jobs, null, 2))
await mongoose.disconnect()
