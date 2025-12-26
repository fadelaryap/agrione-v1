import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage
let storage: Storage | null = null

try {
  // Use environment variables from .env
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    // Handle private key - replace \\n with actual newlines
    let privateKey = process.env.GOOGLE_PRIVATE_KEY
    
    // If private key contains literal \n (backslash + n), replace with actual newline
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    // Ensure proper PEM format with newlines
    if (!privateKey.includes('\n') && privateKey.includes('BEGIN PRIVATE KEY')) {
      // Key might be on one line, try to format it properly
      privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      privateKey = privateKey.replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
    }
    
    storage = new Storage({
      projectId: process.env.GOOGLE_PROJECT_ID || 'mystical-moon-469502-m5',
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID || 'mystical-moon-469502-m5',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
    })
    console.log('GCS Storage initialized successfully')
  } else {
    console.error('GCS credentials not configured - missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY')
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error)
  storage = null
}

const bucketName = process.env.GCS_BUCKET_NAME || 'agrione-media'

export async function POST(request: NextRequest) {
  try {
    // Check if storage is initialized
    if (!storage) {
      console.error('GCS storage not initialized. Check environment variables.')
      return NextResponse.json(
        { error: 'GCS not configured. Please check environment variables.' },
        { status: 500 }
      )
    }
    
    const bucket = storage.bucket(bucketName)
    
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
