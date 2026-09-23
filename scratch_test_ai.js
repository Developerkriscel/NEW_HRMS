import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import Tenant from './models/Tenant.js'
import { parseResumeWithAi } from './lib/aiService.js'

async function checkAi() {
  await mongoose.connect(process.env.MONGODB_URI)
  
  const tenant = await Tenant.findOne({}).lean()
  if (!tenant) {
    console.log("No tenant found!")
    process.exit(1)
  }
  
  console.log("Tenant AI Provider:", tenant.aiSettings?.provider)
  console.log("Tenant AI Model:", tenant.aiSettings?.model)
  
  const testResume = `
  John Doe
  Software Engineer
  5 years of experience in JavaScript, React, Node.js.
  Worked at TechCorp from 2020 to Present.
  Education: BSc Computer Science, MIT (2015-2019).
  `
  
  console.log("Testing AI Resume Parsing...")
  
  try {
    const parsedData = await parseResumeWithAi(testResume, tenant._id)
    console.log("Parsed Data Results:", JSON.stringify(parsedData, null, 2))
  } catch(e) {
    console.error("AI Error:", e)
  }
  
  process.exit(0)
}

checkAi().catch(console.error)
