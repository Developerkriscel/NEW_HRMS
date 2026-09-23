import mongoose from 'mongoose'
import crypto from 'crypto'

async function encryptKeyAndSetMistral() {
  await mongoose.connect('mongodb://localhost:27017/nexahr')
  const Tenant = mongoose.connection.collection('tenants')
  
  const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf-8')
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  
  const keyToEncrypt = "Z1DodE4rReIk0mlXtiNC0iO2DWZcOuUv"
  
  let encrypted = cipher.update(keyToEncrypt, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  
  const preview = "Z1Do...cOuUv"

  await Tenant.updateMany({}, {
    $set: {
      'aiSettings.provider': 'MISTRAL',
      'aiSettings.model': 'mistral-large-latest',
      'aiSettings.apiKeyCiphertext': encrypted,
      'aiSettings.apiKeyIv': iv.toString('hex'),
      'aiSettings.apiKeyTag': authTag,
      'aiSettings.apiKeyPreview': preview
    }
  })
  
  console.log("Updated tenant with Mistral key!")
  process.exit(0)
}

encryptKeyAndSetMistral().catch(console.error)
