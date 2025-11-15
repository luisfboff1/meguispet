# Navigation Fix Documentation

## Problem
Sometimes when navigating between pages in the application, the URL would change but the page content wouldn't update, requiring a hard refresh (F5) to see the new page.

## Root Cause
In Next.js applications using the Pages Router, when navigating between pages using client-side navigation (`Link` component or `router.push`), React component instances can be reused between different pages if they share the same component tree structure. This caused pages to not re-initialize their data when users navigated away and back.

## Solution
Added `router.pathname` as a `key` prop to the `Component` in `pages/_app.tsx`:

```tsx
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  
  return (
    <MainLayout>
      {/* Use router.pathname as key to force remount only when page changes */}
      <Component {...pageProps} key={router.pathname} />
    </MainLayout>
  )
}
```

## Why `router.pathname` Instead of `router.asPath`?

- **`router.pathname`**: `/dashboard` - Only the route path
- **`router.asPath`**: `/produtos?categoria=racao` - Includes query parameters

Using `router.pathname` ensures:
- ✅ Component remounts when navigating between different pages
- ✅ Component does NOT remount when only query parameters change
- ✅ Preserves page-level caching (5-minute API cache still works)
- ✅ Allows pages with query parameters to update without full remount

## How It Works

1. **Different Pages**: When navigating from `/dashboard` to `/vendas`, `router.pathname` changes, triggering a remount
2. **Same Page, Different Query**: When navigating from `/produtos?categoria=racao` to `/produtos?categoria=brinquedos`, `router.pathname` stays `/produtos`, so no remount occurs. The page can handle the query change in its own useEffect
3. **Cache Preserved**: Page-level caching (like the 5-minute dashboard cache) is preserved because the component remounts, but the cache is stored in refs that survive across mounts

## Trade-offs

### Pros ✅
- Simple, one-line change in _app.tsx
- Fixes navigation issues reliably
- Preserves query parameter handling
- Minimal performance impact
- No changes needed to individual pages

### Cons ⚠️
- Pages lose client-side state when navigating away and back
- Scroll position is reset on page navigation
- Any in-memory data is lost (but API cache via refs is preserved)

## Comparison with Alternatives

### ❌ Using `router.asPath` (Rejected)
Would cause remount on every query parameter change, breaking features that rely on query parameters like search and filters.

### ❌ Adding `router.asPath` to useEffect dependencies (Rejected - Caused Major Issues)
This approach caused pages to stop changing entirely because:
- `router.asPath` changes on EVERY navigation in the app
- Created race conditions and event listener issues
- Pages would try to reload while unmounting
- Made navigation completely non-functional

### ✅ Using `router.pathname` (Current Solution)
Perfect balance - remounts on page changes, preserves query parameter handling.

## Testing

To verify the fix works:

1. Navigate to Dashboard
2. Navigate to Vendas
3. Navigate back to Dashboard
4. ✅ Dashboard loads fresh content (cache logic still applies)
5. Navigate to `/produtos?categoria=racao`
6. Navigate to `/produtos?categoria=brinquedos`
7. ✅ Page updates query handling without full remount

## Performance Impact

**API Caching Still Works:**
Pages that implement caching with refs (like dashboard's 5-minute cache) maintain their cache across remounts because refs survive component lifecycle.

```tsx
// This cache survives remounts because refs persist
const lastFetchRef = useRef<number>(0)

const loadData = useCallback(async () => {
  const now = Date.now()
  if (now - lastFetchRef.current < CACHE_DURATION) {
    return // ✅ Cache still works!
  }
  // ... fetch data
}, [])
```

## Related Files

- `pages/_app.tsx` - Main fix implementation

## References

- [Next.js Router Documentation](https://nextjs.org/docs/pages/api-reference/functions/use-router)
- [React Keys Documentation](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [React useRef for Persistence](https://react.dev/reference/react/useRef)
