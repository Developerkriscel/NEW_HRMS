import mongoose from 'mongoose'
import { model } from './_base'

// Replaces the old Redis "reset:token:<token>" keys (1 hour TTL).
const PasswordResetTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  expiresAt: { type: Date, required: true },
})

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model('PasswordResetToken', PasswordResetTokenSchema)
