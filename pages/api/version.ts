import type { NextApiRequest, NextApiResponse } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Version API endpoint
 * Returns the current build ID for cache-busting purposes
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    // Read the BUILD_ID file from .next directory
    const buildIdPath = join(process.cwd(), '.next', 'BUILD_ID')
    const buildId = readFileSync(buildIdPath, 'utf-8').trim()

    // Set cache headers to ensure this endpoint is never cached
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.status(200).json({
      success: true,
      buildId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error reading build ID:', error)
    
    // Provide specific error messages for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as NodeJS.ErrnoException)?.code
    
    let detailedMessage = 'Failed to read build ID'
    if (errorCode === 'ENOENT') {
      detailedMessage = 'BUILD_ID file not found - application may not be built yet'
    } else if (errorCode === 'EACCES') {
      detailedMessage = 'Permission denied reading BUILD_ID file'
    }
    
    return res.status(500).json({
      success: false,
      message: detailedMessage,
      error: errorMessage
    })
  }
}
