import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage
let storage: Storage

try {
  // Use environment variables from .env
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    storage = new Storage({
      projectId: process.env.GOOGLE_PROJECT_ID || 'mystical-moon-469502-m5',
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID || 'mystical-moon-469502-m5',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
    })
  } else {
    throw new Error('GCS credentials not configured')
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error)
}

const bucketName = process.env.GCS_BUCKET_NAME || 'agrione-media'
const bucket = storage.bucket(bucketName)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '/')
    const fileExtension = file.name.split('.').pop() || ''
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const filename = `${date}/${timestamp}_${baseName}.${fileExtension}`

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to GCS
    const fileUpload = bucket.file(filename)
    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
      public: true, // Make file public
    })

    // Return public URL
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
    })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}

