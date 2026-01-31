# Deployment Guide

This application supports multiple environments (development, staging, production) and is configured for deployment on various platforms including DigitalOcean App Platform.

## Environment Management

### Environment Files

The application uses separate environment files for different deployment stages:

- `.env.development` - Local development (git-ignored)
- `.env.staging` - Staging environment (git-ignored, optional)
- `.env.production` - Production environment (git-ignored)
- `.env.example` - Template file (committed to git)

**First Time Setup:**
```bash
# Copy the example file
cp .env.example .env.development

# Add your Supabase credentials
# Get them from: https://supabase.com/dashboard → Settings → API
```

### Build Commands

- **Development:** `npm run dev` (uses `.env.development`)
- **Staging Build:** `npm run build:staging` (uses `.env.staging`)
- **Production Build:** `npm run build` (uses `.env.production`)

## DigitalOcean App Platform

### What's Been Configured

1. **package.json** - Added `serve` package and `start` script that runs on port 8080
2. **Procfile** - Specifies how to start the web process
3. **.do/app.yaml** - DigitalOcean App Platform configuration

## Deployment Steps

### Option 1: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
3. Click "Create App" and select your GitHub repository
4. DigitalOcean will automatically detect the `.do/app.yaml` configuration
5. Add your environment variables in the App Platform dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Next" and then "Create Resources"

### Option 2: Manual Configuration

If not using the app.yaml, configure manually:

**Build Command:**
```
npm install && npm run build
```

**Run Command:**
```
npm start
```

**HTTP Port:**
```
8080
```

## Environment Variables

Make sure to add these environment variables in the DigitalOcean App Platform dashboard:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NODE_ENV` - Set to "production"

## Important Notes

- The app will build static files to the `dist` folder
- The `serve` package serves these static files on port 8080
- Make sure your Supabase project allows requests from your DigitalOcean domain
- Update CORS settings in Supabase if needed

## Testing Locally

To test the production build locally:

```bash
npm run build
npm start
```

Then visit http://localhost:8080

## Troubleshooting

If deployment fails:
1. Check the build logs in DigitalOcean dashboard
2. Verify all environment variables are set correctly
3. Ensure your GitHub repository has the latest changes
4. Check that Supabase credentials are valid
