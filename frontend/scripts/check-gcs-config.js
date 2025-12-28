#!/usr/bin/env node

/**
 * Script untuk check konfigurasi Google Cloud Storage
 * Usage: node scripts/check-gcs-config.js
 */

const fs = require('fs')
const path = require('path')

console.log('='.repeat(60))
console.log('Google Cloud Storage Configuration Checker')
console.log('='.repeat(60))
console.log()

// 1. Check package.json
console.log('1. Checking package.json...')
const packageJsonPath = path.join(__dirname, '..', 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const gcsVersion = packageJson.dependencies?.['@google-cloud/storage']
  const nextVersion = packageJson.dependencies?.next
  
  console.log('   ✓ package.json found')
  console.log(`   - @google-cloud/storage: ${gcsVersion || 'NOT FOUND'}`)
  console.log(`   - next: ${nextVersion || 'NOT FOUND'}`)
} else {
  console.log('   ✗ package.json NOT FOUND')
}
console.log()

// 2. Check package-lock.json for actual installed version
console.log('2. Checking package-lock.json for installed version...')
const packageLockPath = path.join(__dirname, '..', 'package-lock.json')
if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
  const gcsPackage = packageLock.packages?.['node_modules/@google-cloud/storage']
  
  if (gcsPackage) {
    console.log('   ✓ @google-cloud/storage found in package-lock.json')
    console.log(`   - Installed version: ${gcsPackage.version}`)
    console.log(`   - License: ${gcsPackage.license || 'N/A'}`)
    
    // Check dependencies
    if (gcsPackage.dependencies) {
      console.log('   - Key dependencies:')
      Object.entries(gcsPackage.dependencies).forEach(([dep, version]) => {
        if (['gaxios', 'google-auth-library', 'abort-controller'].includes(dep)) {
          console.log(`     * ${dep}: ${version}`)
        }
      })
    }
  } else {
    console.log('   ✗ @google-cloud/storage NOT FOUND in package-lock.json')
  }
} else {
  console.log('   ✗ package-lock.json NOT FOUND')
}
console.log()

// 3. Check environment variables (if running in Node.js environment)
console.log('3. Checking environment variables...')
const envVars = {
  'GOOGLE_CLIENT_EMAIL': process.env.GOOGLE_CLIENT_EMAIL,
  'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY,
  'GOOGLE_PRIVATE_KEY_ID': process.env.GOOGLE_PRIVATE_KEY_ID,
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_PROJECT_ID': process.env.GOOGLE_PROJECT_ID,
  'GCS_BUCKET_NAME': process.env.GCS_BUCKET_NAME,
}

let allSet = true
Object.entries(envVars).forEach(([key, value]) => {
  const isSet = value !== undefined && value !== ''
  const status = isSet ? '✓' : '✗'
  const displayValue = key === 'GOOGLE_PRIVATE_KEY' 
    ? (isSet ? `SET (${value.length} chars)` : 'NOT SET')
    : (isSet ? value : 'NOT SET')
  
  console.log(`   ${status} ${key}: ${displayValue}`)
  if (!isSet && key !== 'GOOGLE_PRIVATE_KEY_ID' && key !== 'GOOGLE_CLIENT_ID') {
    allSet = false
  }
})
console.log()

// 4. Check upload route file
console.log('4. Checking upload route file...')
const uploadRoutePath = path.join(__dirname, '..', 'app', 'upload', 'route.ts')
if (fs.existsSync(uploadRoutePath)) {
  console.log('   ✓ route.ts found')
  const routeContent = fs.readFileSync(uploadRoutePath, 'utf8')
  
  // Check for key patterns
  const checks = {
    'Uses @google-cloud/storage': routeContent.includes('@google-cloud/storage'),
    'Has Storage initialization': routeContent.includes('new Storage'),
    'Uses createWriteStream': routeContent.includes('createWriteStream'),
    'Uses file.save': routeContent.includes('.save('),
    'Has resumable option': routeContent.includes('resumable'),
  }
  
  Object.entries(checks).forEach(([check, result]) => {
    console.log(`   ${result ? '✓' : '✗'} ${check}`)
  })
} else {
  console.log('   ✗ route.ts NOT FOUND')
}
console.log()

// 5. Check docker-compose.prod.yml
console.log('5. Checking docker-compose.prod.yml...')
const dockerComposePath = path.join(__dirname, '..', '..', 'docker-compose.prod.yml')
if (fs.existsSync(dockerComposePath)) {
  console.log('   ✓ docker-compose.prod.yml found')
  const dockerContent = fs.readFileSync(dockerComposePath, 'utf8')
  
  const envChecks = [
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_PROJECT_ID',
    'GCS_BUCKET_NAME',
  ]
  
  envChecks.forEach(envVar => {
    const found = dockerContent.includes(envVar)
    console.log(`   ${found ? '✓' : '✗'} ${envVar} configured`)
  })
} else {
  console.log('   ✗ docker-compose.prod.yml NOT FOUND')
}
console.log()

// Summary
console.log('='.repeat(60))
console.log('Summary:')
console.log('='.repeat(60))

if (!allSet && process.env.NODE_ENV !== 'production') {
  console.log('⚠️  Some environment variables are not set')
  console.log('   (This is OK if running locally, but must be set in production)')
}

console.log()
console.log('Next steps:')
console.log('1. If environment variables missing, check .env or docker-compose.prod.yml')
console.log('2. Run: npm list @google-cloud/storage (to verify installed version)')
console.log('3. Check production logs: docker logs agrione_frontend')
console.log('4. Test upload with small file (< 5MB) vs large file (> 5MB)')
console.log()


