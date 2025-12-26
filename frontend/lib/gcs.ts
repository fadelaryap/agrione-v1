// Google Cloud Storage client for frontend direct upload

interface GCSConfig {
  bucketName: string
  credentials: {
    type: string
    project_id: string
    private_key_id: string
    private_key: string
    client_email: string
    client_id: string
    auth_uri: string
    token_uri: string
    auth_provider_x509_cert_url: string
    client_x509_cert_url: string
  }
}

// Get GCS config from environment variables
function getGCSConfig(): GCSConfig | null {
  const bucketName = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME
  const credentialsJson = process.env.NEXT_PUBLIC_GCS_CREDENTIALS

  if (!bucketName || !credentialsJson) {
    return null
  }

  try {
    const credentials = JSON.parse(credentialsJson)
    return {
      bucketName,
      credentials,
    }
  } catch (error) {
    console.error('Failed to parse GCS credentials:', error)
    return null
  }
}

// Generate OAuth2 access token from service account credentials
async function getAccessToken(credentials: GCSConfig['credentials']): Promise<string> {
  const jwt = await import('jsonwebtoken')
  
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri,
    exp: expiry,
    iat: now,
    scope: 'https://www.googleapis.com/auth/devstorage.full_control',
  }

  const token = jwt.default.sign(payload, credentials.private_key, {
    algorithm: 'RS256',
    keyid: credentials.private_key_id,
  })

  // Exchange JWT for access token
  const response = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Upload file directly to GCS
export async function uploadToGCS(file: File): Promise<string> {
  const config = getGCSConfig()
  if (!config) {
    throw new Error('GCS not configured. Please set NEXT_PUBLIC_GCS_BUCKET_NAME and NEXT_PUBLIC_GCS_CREDENTIALS')
  }

  // Generate unique filename
  const timestamp = Date.now()
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '/')
  const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const objectName = `${date}/${timestamp}_${fileName}`

  // Get access token
  const accessToken = await getAccessToken(config.credentials)

  // Upload to GCS using REST API
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${config.bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`Failed to upload to GCS: ${error}`)
  }

  // Make object publicly readable (optional)
  const makePublicUrl = `https://storage.googleapis.com/storage/v1/b/${config.bucketName}/o/${encodeURIComponent(objectName)}/acl`
  
  try {
    await fetch(makePublicUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: 'allUsers',
        role: 'READER',
      }),
    })
  } catch (error) {
    console.warn('Failed to make object public (may already be public):', error)
  }

  // Return public URL
  return `https://storage.googleapis.com/${config.bucketName}/${objectName}`
}

