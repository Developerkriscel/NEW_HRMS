import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI

async function test() {
  await mongoose.connect(MONGODB_URI)
  console.log('MongoDB Connected')

  const { findUserByEmail } = await import('../lib/userLookup.js')
  const { comparePassword } = await import('../lib/auth.js')

  const testAccounts = [
    'admin@nexahr.io',
    'admin@acme.com',
    'hr@acme.com',
    'manager@acme.com',
    'employee@acme.com',
    'finance@acme.com',
    'itadmin@acme.com',
  ]

  for (const email of testAccounts) {
    const found = await findUserByEmail(email)
    if (!found) {
      console.error(`FAILED: ${email} NOT FOUND`)
      continue
    }
    const match = await comparePassword('Password@123', found.doc.password)
    console.log(`LOGIN TEST [${email}]: ${match ? 'SUCCESS (VALID PASSWORD)' : 'FAILED (PASSWORD MISMATCH)'}`)
  }

  await mongoose.disconnect()
}

test().catch(console.error)
