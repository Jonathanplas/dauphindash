# Supabase Authentication Setup Guide

## 🎯 Overview
Your DauphinDash app now uses Supabase authentication instead of pasting keys. Users create accounts and sign in to sync their personal progress data.

---

## ✅ Setup Checklist

### 1️⃣ **Supabase Dashboard Setup** (One-time)

#### A. Run the Database Migration
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Copy the contents of `supabase-migration.sql` from this project
5. Paste and **Run** the SQL
6. This will:
   - Add `user_id` column to `daily_progress` table
   - Set up Row Level Security (RLS) so users can only see their own data
   - Create triggers to auto-populate `user_id`

#### B. Enable Email Authentication
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. (Optional) Configure custom email templates

#### C. Configure Email Confirmations
1. Go to **Authentication** → **Settings** → **Email Auth**
2. For **testing/development**: 
   - Turn **OFF** "Enable email confirmations"
   - This allows immediate sign-in after signup
3. For **production**:
   - Turn **ON** "Enable email confirmations" for security
   - Users must verify email before signing in

#### D. Get Your API Credentials
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (the long JWT token starting with `eyJ...`)

---

### 2️⃣ **First-Time App Setup** (Each User)

#### When Using the App:
1. Open your app in browser
2. Click **"🔗 Setup Supabase"** button
3. Enter:
   - **Supabase Project URL** (from step 1D)
   - **Supabase Anon Key** (from step 1D)
4. Click **"Save Config"**
5. You'll see the Sign In/Sign Up screen

#### Create Account:
1. Click **"Need an account? Sign Up"**
2. Enter your email and password
3. Click **"Sign Up"**
4. If email confirmation is enabled, check your email and verify
5. Sign in with your credentials

---

## 🔐 How Authentication Works

### User Flow:
```
1. User enters Supabase URL + anon key (one-time setup)
   ↓
2. User signs up with email/password
   ↓
3. Supabase creates user account
   ↓
4. User signs in
   ↓
5. App loads user's personal data (filtered by user_id)
   ↓
6. All data operations are user-scoped via RLS
```

### Security Features:
- ✅ **Row Level Security (RLS)**: Users can only access their own data
- ✅ **Automatic user_id**: Database trigger sets user_id on insert
- ✅ **Email/Password**: Secure authentication via Supabase Auth
- ✅ **Session Management**: Auto-refresh tokens, persistent sessions

---

## 📊 Database Schema

### `daily_progress` Table:
```sql
CREATE TABLE daily_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NEW!
    date DATE NOT NULL,
    weight DECIMAL,
    leetcode INTEGER,
    workout BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)  -- One entry per user per day
);
```

### RLS Policies:
- Users can **SELECT** only their own data (`user_id = auth.uid()`)
- Users can **INSERT** only with their own user_id
- Users can **UPDATE** only their own data
- Users can **DELETE** only their own data

---

## 🐛 Troubleshooting

### "Authentication failed"
- ✅ Check email/password are correct
- ✅ If email confirmation is enabled, verify your email first
- ✅ Check browser console for detailed error messages

### "Not authenticated, cannot load data"
- ✅ Sign in first before syncing data
- ✅ Check if session expired (sign in again)

### No data showing after sign in
- ✅ Check Supabase Dashboard → Table Editor → `daily_progress`
- ✅ Verify `user_id` matches your auth user
- ✅ Check browser console for sync errors

### RLS Policy Errors
- ✅ Make sure you ran the migration SQL
- ✅ Check **Authentication** → **Policies** in Supabase Dashboard
- ✅ Policies should be enabled on `daily_progress` table

---

## 🔄 Migration from Old System

If you have existing data from the old key-based system:

1. **Sign in** with your new account
2. Your local data will automatically sync to Supabase
3. Data will be associated with your `user_id`
4. Old users need to create their own accounts (data is per-user now)

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Enable email confirmations in Supabase
- [ ] Configure custom email templates (optional)
- [ ] Set up custom domain for emails (optional)
- [ ] Test signup/signin flow thoroughly
- [ ] Test RLS policies (try accessing other users' data)
- [ ] Monitor Supabase logs for auth issues
- [ ] Set up database backups

---

## 📝 Code Overview

### Key Files:
- `supabase-sync.js`: Handles Supabase client, auth, and data operations
- `script.js`: Main app logic, UI updates, modal handling
- `supabase-migration.sql`: Database schema changes for auth
- `index.html`: Auth modal UI

### Main Classes/Methods:
- `SupabaseSync.signUp(email, password)`: Create new user
- `SupabaseSync.signIn(email, password)`: Sign in existing user
- `SupabaseSync.signOut()`: Sign out current user
- `SupabaseSync.getSession()`: Get current auth session
- `SupabaseSync.loadAllData()`: Load user's data (RLS filtered)
- `SupabaseSync.saveDayData(date, data)`: Save with user_id

---

## 💡 Tips

- **Development**: Disable email confirmations for faster testing
- **Production**: Enable email confirmations for security
- **Privacy**: Each user only sees their own data
- **Multi-device**: Users can access data from any device by signing in
- **Offline**: Local storage still works, syncs when online

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase Dashboard → Logs
3. Verify RLS policies are active
4. Test with a fresh account
5. Check this guide's troubleshooting section

---

**🎉 You're all set! Users can now sign up and track their progress securely.**
