# Story Plotter - No External Storage Required

This web application has been refactored to **not require Vercel KV or Cloudflare R2 storage**.

## ✅ What Changed

### Removed Dependencies
- ❌ Vercel KV (key-value database)
- ❌ Cloudflare R2 (object storage)

### New Storage Approach
- ✅ **In-memory storage** for user data and projects
- ✅ **JWT-based authentication** (session tokens only)
- ✅ **No external storage costs**

## 📦 Deployment

### Environment Variables Needed

Only **ONE** environment variable is required:

```bash
NEXTAUTH_SECRET=<generate-a-random-secret>
```

**Generate the secret:**
```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Or online: https://generate-secret.vercel.app/32

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variable: `NEXTAUTH_SECRET`
4. Deploy ✨

**No storage configuration needed!**

## ⚠️ Important Notes

### Data Persistence
- **Data is stored in-memory** on the server
- Data **will be lost** when the server restarts
- This is suitable for:
  - Development/testing
  - MVP/demo purposes
  - Proof of concept
  
### For Production Use
To persist data permanently, you would need to:
1. Add a database (PostgreSQL, MySQL, MongoDB, etc.)
2. Update `src/lib/storage.ts` to use the database instead of in-memory maps
3. Or implement client-side storage with IndexedDB/localStorage

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

### Test Signup
1. Go to http://localhost:3000/signup
2. Create an account (no email verification needed)
3. Login and start creating projects

## 📝 File Changes

Key files modified:
- `src/lib/storage.ts` - New in-memory storage module
- `src/lib/auth.ts` - Updated to use new storage
- `src/app/api/auth/signup/route.ts` - Simplified signup
- `src/app/api/auth/forgot-password/route.ts` - Simplified password reset
- `src/app/api/projects/*.ts` - Updated all project endpoints
- `src/lib/r2.ts` - Made optional with proper error handling

Files that can be removed (optional):
- `src/lib/kv.ts`
- `src/lib/kv-mock.ts`

## 💰 Cost
**$0/month** - No external services required!
