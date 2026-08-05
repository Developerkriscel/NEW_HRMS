import mongoose from 'mongoose'
import { model } from './_base'

// Replaces the old Redis "blacklist:token:<jwt>" keys — logged-out access
// tokens are recorded here and checked on every authenticated request.
// The TTL index auto-deletes the document once the token would have expired
// naturally, so the collection never grows unbounded.
const TokenBlacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
})

TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model('TokenBlacklist', TokenBlacklistSchema)
