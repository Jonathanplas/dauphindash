# 🔧 Setup Your Supabase Credentials

## Quick Setup (2 minutes)

### Step 1: Get Your Credentials from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long JWT token)

### Step 2: Add Credentials to Your Code

Open `supabase-sync.js` and find these lines at the top:

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL_HERE',
    anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
};
```

Replace with your actual values:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://xxxxx.supabase.co',  // Your Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Your anon key
};
```

### Step 3: Setup Database

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the contents of `supabase-complete-setup.sql`
3. Paste and click **Run**

### Step 4: Configure Email Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Go to **Authentication** → **Settings**
4. For testing: **Disable** "Enable email confirmations"

### Step 5: Test It!

1. Refresh your app
2. You should see **"Sign In"** button (no setup needed!)
3. Click **"Sign Up"** to create an account
4. Start tracking your progress!

---

## ❓ FAQ

### Is the anon key safe to expose?
**Yes!** The anon key is designed to be public. It only allows operations permitted by your Row Level Security (RLS) policies, which ensure users can only access their own data.

### Do I need to push this to GitHub?
**Up to you!** Since the anon key is public, it's safe to commit. However, if you want to keep your Supabase project URL private, you can add `supabase-sync.js` to `.gitignore` and configure it locally.

### Can multiple people use this app?
**Yes!** Each person creates their own account, and their data is completely isolated. Row Level Security ensures users can only see their own progress data.

---

## 🎉 Done!

Once you add your credentials, users can:
- ✅ Create accounts with email/password
- ✅ Sign in from any device
- ✅ Have their data synced automatically
- ✅ Keep their data private (only they can see it)

No more manual setup required!
