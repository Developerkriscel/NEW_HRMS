import 'dotenv/config'
import mongoose from 'mongoose'
import Tenant from './models/Tenant.js'
import { parseResumeWithAi } from './lib/aiService.js'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  const tenant = await Tenant.findOne({ deleted: false }).lean()
  if (!tenant) return console.log('No tenant found')
  console.log('Testing for tenant:', tenant._id)
  
  const result = await parseResumeWithAi("This is a test resume for John Doe, a software engineer with 5 years of experience in JavaScript.", String(tenant._id))
  console.log('Parse Result:', result)
  
  process.exit(0)
}

run().catch(console.error)
