
# Supabase Redirect URL Configuration

## Current Issue
Email confirmation is failing because Supabase needs the correct redirect URLs configured.

## What URLs Are Needed

### For Natively Hosted App
You need to get these URLs from the Natively platform:
- **Preview URL**: `https://preview-[your-app-id].natively.app` (example format)
- **Production URL**: `https://[your-app-name].natively.app` (example format)

### Supabase Configuration Steps

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication → URL Configuration**
3. Add these URLs:

#### Site URL
```
https://[your-natively-app-url]
```

#### Redirect URLs (Add all of these)
```
https://[your-natively-app-url]/auth-callback
https://[your-natively-app-url]/**
exp://[your-app-slug]
[your-app-slug]://
```

### For Local Development Testing
If you want to test locally while waiting for the hosted URL:

#### Site URL (Local)
```
http://localhost:8081
```

#### Redirect URLs (Local)
```
http://localhost:8081/auth-callback
http://localhost:8081/**
exp://localhost:8081
```

## Current App Configuration

Your app is already set up to handle these redirects in:
- `app/auth-callback.tsx` - Handles email confirmation callbacks
- `contexts/AuthContext.tsx` - Manages authentication state

## Next Steps

1. **Get your Natively hosted URL** from:
   - Natively dashboard
   - Natively support team
   - Your deployment confirmation email

2. **Add the URLs to Supabase** following the format above

3. **Test email confirmation** by:
   - Signing up with a new email
   - Checking your email for the confirmation link
   - Clicking the link (should redirect to your app)
   - Verifying you can sign in

## Troubleshooting

If email confirmation still fails after adding URLs:
- Check that all redirect URLs are added (including the `/**` wildcard)
- Verify the URLs match exactly (no trailing slashes where not needed)
- Check Supabase logs for any redirect errors
- Ensure your app's `app.json` has the correct Supabase URL

## Contact Information

**For Natively App URL:**
- Contact Natively platform support
- Check your Natively dashboard under deployment/settings

**For Supabase Issues:**
- Check Supabase dashboard logs
- Verify authentication settings
- Test with local URLs first to isolate the issue
