import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'krisceltech_platform_admin'

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME })
  console.log('Connected to MongoDB')

  const PlatformOperatorSchema = new mongoose.Schema({}, { strict: false, collection: 'superadminusers' })
  const PlatformOperator = mongoose.models.PlatformOperator || mongoose.model('PlatformOperator', PlatformOperatorSchema)

  const hashedPassword = await bcrypt.hash('Password@123', 12)
  await PlatformOperator.updateMany(
    { email: 'admin@nexahr.io' },
    { $set: { password: hashedPassword, active: true, status: 'ACTIVE' } }
  )

  console.log('Successfully set admin@nexahr.io password to Password@123')
  await mongoose.disconnect()
}

run().catch(console.error)
