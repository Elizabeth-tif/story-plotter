# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
3. **GitHub Repository** - Your project should be in a GitHub repo

## Step 1: Set Up Cloudflare R2

### Create R2 Bucket

1. Go to Cloudflare Dashboard > R2
2. Click "Create bucket"
3. Name it `story-plotter` (or your preferred name)
4. Click "Create bucket"

### Create API Token

1. In R2 dashboard, click "Manage R2 API Tokens"
2. Click "Create API token"
3. Give it a name (e.g., "Story Plotter Production")
4. Set permissions: **Object Read & Write**
5. Set TTL or leave as unlimited
6. Click "Create API Token"
7. **Save these values** (you won't see them again):
   - Access Key ID
   - Secret Access Key
   - Account ID (from the URL or dashboard)

### Get R2 Endpoint

Your R2 endpoint URL format: `https://<account-id>.r2.cloudflarestorage.com`

Replace `<account-id>` with your Cloudflare Account ID.

## Step 2: Set Up Vercel KV (Redis)

1. Go to Vercel Dashboard > Storage
2. Click "Create Database" > "KV"
3. Name it (e.g., "story-plotter-kv")
4. Select your preferred region
5. Click "Create"
6. Vercel will show you the connection details - keep this tab open

## Step 3: Deploy to Vercel

### Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### Configure Environment Variables

Add these environment variables in Vercel project settings:

#### Authentication
```
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app
```

#### Cloudflare R2
```
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
R2_BUCKET_NAME=story-plotter
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

#### Vercel KV
These are auto-filled when you connect the KV database:
```
KV_URL=<from-vercel-dashboard>
KV_REST_API_URL=<from-vercel-dashboard>
KV_REST_API_TOKEN=<from-vercel-dashboard>
KV_REST_API_READ_ONLY_TOKEN=<from-vercel-dashboard>
```

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 4: Connect Vercel KV to Project

1. In Vercel Dashboard, go to your project
2. Go to Storage tab
3. Click "Connect Store"
4. Select the KV database you created
5. This will automatically add the KV environment variables

## File Structure in R2

Your R2 bucket will automatically create this structure:

```
users/
  └── {userId}/
      ├── profile/
      │   ├── avatar
      │   └── settings.json
      ├── uploads/           # Generic file uploads
      │   └── {uuid}.{ext}
      └── projects/
          ├── index.json
          └── {projectId}/
              ├── project.json
              ├── versions/
              │   └── v{version}-{timestamp}.json
              └── files/
                  ├── characters/
                  ├── scenes/
                  ├── locations/
                  ├── plotlines/
                  ├── notes/
                  └── exports/
```

**No manual folder creation needed** - the application creates folders automatically.

## Security Features

✅ **All R2 access goes through API routes**
- Files are uploaded via pre-signed URLs
- Files are fetched through `/api/files/[...key]` proxy
- Browser never directly accesses R2 bucket
- User authentication enforced on every request

✅ **No CORS issues**
- All requests go through your Next.js API
- Same-origin policy maintained

✅ **User isolation**
- Users can only access files in their own `users/{userId}/` path
- Authorization checked on every file operation

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | ✅ | Secret for session encryption |
| `NEXTAUTH_URL` | ✅ | Your deployment URL |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API Access Key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API Secret Key |
| `R2_BUCKET_NAME` | ✅ | Your R2 bucket name |
| `R2_ENDPOINT` | ✅ | R2 endpoint URL |
| `KV_URL` | ✅ | Vercel KV Redis URL |
| `KV_REST_API_URL` | ✅ | Vercel KV REST API URL |
| `KV_REST_API_TOKEN` | ✅ | Vercel KV API Token |
| `KV_REST_API_READ_ONLY_TOKEN` | ✅ | Vercel KV Read-only Token |

## Verification

After deployment, test:

1. ✅ Sign up / Login works
2. ✅ Create a project
3. ✅ Upload a file (image or document)
4. ✅ View uploaded file
5. ✅ Create characters, scenes, etc.
6. ✅ Auto-save functionality

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify Node.js version compatibility (18.x+)
- Check build logs in Vercel dashboard

### Upload Fails
- Verify R2 credentials are correct
- Check R2 bucket name matches `R2_BUCKET_NAME`
- Ensure R2 endpoint URL is correct

### KV Errors
- Verify KV database is connected to project
- Check KV environment variables are set
- Ensure KV database region matches deployment region

### Authentication Issues
- Regenerate `NEXTAUTH_SECRET` if needed
- Ensure `NEXTAUTH_URL` matches your domain exactly
- Check HTTPS is enabled (required for cookies)

## Local Development

For local development, copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your development credentials. Use the same R2 bucket or create a separate development bucket.

## Custom Domain (Optional)

1. Go to Vercel project > Settings > Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` to your custom domain
4. Redeploy

## Monitoring

Monitor your deployment:
- **Vercel Analytics**: Built-in performance monitoring
- **R2 Analytics**: Check R2 dashboard for storage usage
- **KV Usage**: Monitor in Vercel Storage dashboard

## Cost Estimates

- **Vercel**: Free tier includes:
  - 100GB bandwidth/month
  - Serverless function executions
  
- **Cloudflare R2**: Free tier includes:
  - 10GB storage/month
  - 1M Class A operations/month
  - 10M Class B operations/month
  
- **Vercel KV**: Free tier includes:
  - 256MB storage
  - 3000 commands/day

Perfect for small to medium projects! 🚀
