import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  const apiKey = "Z1DodE4rReIk0mlXtiNC0iO2DWZcOuUv"
  
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.mistral.ai/v1'
  })

  try {
    const response = await client.chat.completions.create({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: 'Reply with JSON: {"test": "ok"}' }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
    
    return NextResponse.json({ 
      success: true,
      model: 'mistral-large-latest',
      content: response.choices[0].message.content
    })
  } catch(e) {
    return NextResponse.json({ 
      success: false, 
      model: 'mistral-large-latest',
      errorName: e.name, 
      errorMessage: e.message, 
      errorDetails: e.response?.data || e.error 
    })
  }
}
