import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const KnowledgeBaseArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    content: { type: String, required: true }, // HTML or Markdown
    
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    
    publishedAt: { type: Date, default: null },
    
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },

    ...baseFields,
  },
  { timestamps: true }
)

KnowledgeBaseArticleSchema.index({ status: 1, category: 1 })

export default model('KnowledgeBaseArticle', KnowledgeBaseArticleSchema)
