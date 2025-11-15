# Debugging Guide: Navigation Issues

If navigation still doesn't work after the v3 fix, please follow these steps to help diagnose the issue:

## 1. Browser Console Check

Open DevTools (F12) and check the Console tab while navigating:

### Expected Behavior
When you click to navigate from Dashboard → Financeiro, you should see:
- Router events firing
- Component unmount logs (if any)
- Component mount logs (if any)
- No error messages

### Common Errors to Look For
- ❌ "Cannot read property of undefined"
- ❌ "Hydration mismatch"
- ❌ React errors about keys or children
- ❌ Network errors (red text in Console)

## 2. Network Tab Check

Open the Network tab in DevTools:

### What to Check
1. Click to navigate to a different page
2. Watch for new network requests
3. Check if the page HTML/data is being fetched

### Expected Behavior
- New fetch/XHR requests should appear
- No 404 or 500 errors
- JSON responses should return successfully

## 3. React DevTools Check

If you have React DevTools installed:

### Steps
1. Open React DevTools
2. Go to Components tab
3. Navigate between pages
4. Watch the component tree

### Expected Behavior
- Component tree should update
- Old page components should unmount
- New page components should mount
- Keys should be visible on Component and main elements

## 4. Manual Key Verification

Add this temporary code to verify keys are working:

```tsx
// Add to pages/_app.tsx temporarily
useEffect(() => {
  console.log('🔑 Route changed to:', router.pathname)
}, [router.pathname])
```

### Expected Output
When navigating, you should see console logs like:
```
🔑 Route changed to: /dashboard
🔑 Route changed to: /financeiro
```

## 5. Browser Information

Please provide:
- Browser name and version (Chrome 120, Firefox 121, etc.)
- Operating system (Windows, Mac, Linux)
- Any browser extensions that might interfere (adblockers, React DevTools, etc.)

## 6. Cache Check

Try these steps:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Close and reopen browser
4. Try in incognito/private mode

## 7. Specific Test Case

Try this exact sequence and report what happens:

1. Start on `/login` page
2. Log in successfully
3. Should land on `/dashboard`
4. Click "Financeiro" in sidebar
5. **Report**: Does URL change? Does content change?
6. Click "Vendas" in sidebar
7. **Report**: Does URL change? Does content change?
8. Click "Dashboard" in sidebar
9. **Report**: Does URL change? Does content change?

## 8. Check for Route Protection

The MainLayout has route protection code. Check if:
- You're authenticated (should show user info in header)
- The page you're navigating to is accessible
- There are no permission errors

## 9. Alternative Fix to Test

If nothing above works, try this temporary test:

In `pages/_app.tsx`, change:
```tsx
<Component {...pageProps} key={router.pathname} />
```
to:
```tsx
<Component {...pageProps} key={router.asPath} />
```

This uses the full path including query params. If this works but `router.pathname` doesn't, it tells us something about how Next.js is handling the routing.

## 10. Extreme Debug Mode

Add this to `components/layout/main-layout.tsx` at the top of the component:

```tsx
console.log('🏠 MainLayout render:', {
  pathname: router.pathname,
  asPath: router.asPath,
  hydrated,
  loading,
  isAuthenticated,
  isNoLayoutPage
})
```

This will show every time MainLayout renders and why.

## Report Template

Please copy and fill this out:

```
Browser: [Chrome/Firefox/Safari] version [number]
OS: [Windows/Mac/Linux]
Issue: [Describe what happens when you click to navigate]

Console Errors: [Yes/No - copy any errors here]
Network Errors: [Yes/No - describe]
URL Changes: [Yes/No]
Content Changes: [Yes/No]

Tested in Incognito: [Yes/No]
Hard Refresh Tried: [Yes/No]
Cache Cleared: [Yes/No]

Additional Info: [anything else relevant]
```

## Quick Fixes to Try

Before reporting, try each of these:

1. **Router.push instead of Link**: Check if sidebar is using `<Link>` or `router.push()`
2. **Disable animations**: Comment out AnimatePresence temporarily
3. **Remove memoization**: Comment out useMemo for sidebarContent temporarily
4. **Check for errors**: Look for any JavaScript errors blocking execution

## Next Steps

If none of this helps, we may need to:
1. Check the Sidebar component to see how navigation links work
2. Look at how the routing is configured in next.config.js
3. Check if there are any middleware issues
4. Verify the Next.js version is compatible
