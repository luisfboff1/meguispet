# 🎯 Quick Start: Cache-Busting System

## What Was Fixed?

**Problem**: Clients were seeing old cached code even after bug fixes were deployed.

**Solution**: Automatic version checking system that reloads the page when a new version is deployed.

## For Users

Nothing changes! The system works automatically:
- ✅ Your page will reload automatically when there's a new version
- ✅ No need to press Ctrl + Shift + R anymore
- ✅ Happens in the background, every 5 minutes

## For Developers

### How to Deploy a Fix

1. Make your changes and commit:
```bash
git add .
git commit -m "fix: your bug fix"
git push origin master
```

2. Vercel automatically builds with new timestamp:
   - Old version: `build-1764681779343`
   - New version: `build-1764681850000`

3. Clients get the update automatically:
   - First check: within 5 minutes
   - Auto-reload: 3 seconds after detection
   - All caches cleared

### Testing Your Changes

```bash
# Build locally
pnpm build:local

# Check version
curl http://localhost:3000/api/version

# Make a change and rebuild
# The build ID will be different
pnpm build:local
curl http://localhost:3000/api/version
```

### Verifying in Production

```bash
# Check current version
curl https://gestao.meguispet.com/api/version

# Response:
{
  "success": true,
  "buildId": "build-1764681779343",
  "timestamp": "2025-12-02T13:24:58.779Z"
}
```

## Configuration

### Change Check Interval

Edit `lib/version-checker.ts`:
```typescript
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
```

### Change Reload Delay

Edit `lib/version-checker.ts`:
```typescript
const RELOAD_DELAY_MS = 3000 // 3 seconds
```

### Disable in Development

Already disabled by default in development mode.

## Troubleshooting

### User Reports "Still Seeing Old Version"

1. Check their localStorage:
   ```javascript
   localStorage.getItem('meguispet_app_version')
   ```

2. Force clear and reload:
   ```javascript
   localStorage.removeItem('meguispet_app_version')
   location.reload()
   ```

3. Verify they're getting the API call:
   - Open DevTools > Network
   - Look for `/api/version` call every 5 minutes

### Version API Not Working

```bash
# SSH into server or check Vercel logs
ls -la .next/BUILD_ID

# Should show the build ID file
```

## Files Modified

- ✅ `next.config.js` - Build ID generation
- ✅ `vercel.json` - Cache headers
- ✅ `pages/_app.tsx` - Version check integration
- ✅ `pages/_document.tsx` - HTML cache headers
- ✅ `pages/api/version.ts` - Version API
- ✅ `lib/version-checker.ts` - Version check logic
- ✅ `hooks/useVersionCheck.ts` - React hook

## See Also

- [Full Documentation](./CACHE_BUSTING.md) - Complete technical details
- [Architecture](../../02-architecture/ARQUITETURA.md) - System architecture

---

**Questions?** Check the full documentation in `CACHE_BUSTING.md`
