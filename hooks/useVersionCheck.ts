/**
 * useVersionCheck Hook
 * 
 * React hook for automatic version checking and updates.
 * Ensures clients always run the latest deployed version.
 */

import { useEffect, useState } from 'react'
import { startVersionChecking, updateStoredVersion } from '@/lib/version-checker'

interface UseVersionCheckOptions {
  /**
   * Whether to enable automatic version checking
   * @default true
   */
  enabled?: boolean
  
  /**
   * Callback when a new version is detected
   * If not provided, will auto-reload after 3 seconds
   */
  onNewVersion?: () => void
}

export function useVersionCheck(options: UseVersionCheckOptions = {}) {
  const { enabled = true, onNewVersion } = options
  const [hasNewVersion, setHasNewVersion] = useState(false)
  
  useEffect(() => {
    if (!enabled) return
    
    // Update stored version on mount (after successful load)
    updateStoredVersion()
    
    // Start version checking
    const cleanup = startVersionChecking(() => {
      setHasNewVersion(true)
      
      if (onNewVersion) {
        onNewVersion()
      }
      // If no custom handler, the version-checker will auto-reload
    })
    
    return cleanup
  }, [enabled, onNewVersion])
  
  return { hasNewVersion }
}
