/**
 * Version Checker Utility
 * 
 * Ensures clients always run the latest version by checking for updates
 * and automatically reloading when a new version is deployed.
 * 
 * This solves the issue where clients with cached versions don't see fixes
 * without doing a hard refresh (Ctrl + Shift + R).
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes
const VERSION_STORAGE_KEY = 'meguispet_app_version'
const RELOAD_DELAY_MS = 3000 // 3 seconds delay before reload

/**
 * Gets the current app version from the Next.js build ID
 * The build ID is available in the HTML meta tag we'll add
 */
export async function getCurrentVersion(): Promise<string | null> {
  try {
    // First try to get from meta tag (fastest)
    const metaVersion = document.querySelector('meta[name="build-id"]')?.getAttribute('content')
    if (metaVersion) {
      return metaVersion
    }
    
    // Fallback: fetch a small JSON endpoint that returns the build ID
    const response = await fetch('/api/version', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    if (!response.ok) {
      console.warn('Failed to fetch version info')
      return null
    }
    
    const data = await response.json()
    return data.buildId || null
  } catch (error) {
    console.error('Error checking app version:', error)
    return null
  }
}

/**
 * Checks if a new version is available
 */
export async function checkForNewVersion(): Promise<boolean> {
  const currentVersion = await getCurrentVersion()
  
  if (!currentVersion) {
    return false
  }
  
  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
  
  // First time or no stored version
  if (!storedVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    return false
  }
  
  // Compare versions
  if (storedVersion !== currentVersion) {
    console.log(`New version detected: ${currentVersion} (current: ${storedVersion})`)
    return true
  }
  
  return false
}

/**
 * Reloads the page to get the latest version
 * Uses multiple strategies to ensure hard reload across all browsers
 */
export function reloadToLatestVersion(): void {
  console.log('Reloading to get latest version...')
  
  // Clear all caches before reload
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name))
    })
  }
  
  // Strategy 1: Try cache-busting URL parameter (most reliable)
  const cacheBuster = Date.now()
  const url = new URL(window.location.href)
  url.searchParams.set('_v', cacheBuster.toString())
  
  // Strategy 2: Replace current URL with cache-busted version
  // This works better than reload() in some browsers
  window.location.replace(url.toString())
}

/**
 * Updates the stored version to the current one
 */
export async function updateStoredVersion(): Promise<void> {
  const currentVersion = await getCurrentVersion()
  if (currentVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
  }
}

/**
 * Starts automatic version checking
 * Returns a cleanup function to stop checking
 */
export function startVersionChecking(
  onNewVersion?: () => void
): () => void {
  let intervalId: NodeJS.Timeout | null = null
  
  const checkVersion = async () => {
    const hasNewVersion = await checkForNewVersion()
    
    if (hasNewVersion) {
      if (onNewVersion) {
        onNewVersion()
      } else {
        // Default behavior: auto-reload after a short delay
        console.log(`New version available - reloading in ${RELOAD_DELAY_MS / 1000} seconds...`)
        setTimeout(() => {
          reloadToLatestVersion()
        }, RELOAD_DELAY_MS)
      }
    }
  }
  
  // Check immediately on start
  checkVersion()
  
  // Then check periodically
  intervalId = setInterval(checkVersion, VERSION_CHECK_INTERVAL)
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  }
}
