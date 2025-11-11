# 🚀 Quick Setup Checklist

## Before You Start
- [ ] Have a Supabase account ([sign up here](https://supabase.com))
- [ ] Created a Supabase project

---

## In Supabase Dashboard

### 1. Run the Database Setup
- [ ] Go to **SQL Editor**
- [ ] Copy contents of `supabase-complete-setup.sql`
- [ ] Paste and click **Run**
- [ ] Verify no errors (should see "Success")

### 2. Configure Authentication
- [ ] Go to **Authentication** → **Providers**
- [ ] Ensure **Email** is enabled
- [ ] Go to **Authentication** → **Settings**
- [ ] For testing: **Disable** "Enable email confirmations"
- [ ] For production: **Enable** "Enable email confirmations"

### 3. Get Your Credentials
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- [ ] Copy **anon public** key (long JWT token)

---

## In Your App

### First Time Setup
- [ ] Open the app in your browser
- [ ] Click **"🔗 Setup Supabase"**
- [ ] Paste **Project URL**
- [ ] Paste **anon public key**
- [ ] Click **"Save Config"**

### Create Your Account
- [ ] Click **"Need an account? Sign Up"**
- [ ] Enter your email
- [ ] Enter a password (min 6 characters)
- [ ] Click **"Sign Up"**
- [ ] If email confirmation is enabled, verify your email
- [ ] Sign in with your credentials

### Start Tracking
- [ ] Add your first progress entry
- [ ] Data will automatically sync to Supabase
- [ ] Your data is private - only you can see it

---

## ✅ Verification

### Check Everything Works:
- [ ] Can sign up successfully
- [ ] Can sign in after signup
- [ ] Can see "✅ Synced as your@email.com" message
- [ ] Can add progress data
- [ ] Can see your data in Supabase Dashboard → Table Editor → `daily_progress`
- [ ] Data has your `user_id` populated

### Test Security:
- [ ] Sign out and sign up with a different email
- [ ] Previous user's data should NOT be visible
- [ ] Each user only sees their own data

---

## 🐛 If Something Goes Wrong

### Database Setup Issues
- Check SQL Editor for error messages
- Make sure your project has the `daily_progress` table
- Verify RLS is enabled: Table Editor → `daily_progress` → RLS should show "Enabled"

### Authentication Issues
- Check browser console (F12) for error messages
- Verify email provider is enabled
- Try with email confirmation disabled first
- Check password meets minimum requirements (6+ chars)

### Data Not Syncing
- Verify you're signed in (should see your email in the UI)
- Check browser console for sync errors
- Check Supabase Dashboard → Logs for API errors
- Verify RLS policies exist (Authentication → Policies)

---

## 📞 Need Help?

1. Check `SUPABASE_SETUP_GUIDE.md` for detailed instructions
2. Check browser console (F12) for errors
3. Check Supabase Dashboard → Logs
4. Verify you completed all steps above

---

**Estimated Setup Time: 5-10 minutes**

**You're ready when:**
✅ Database setup complete
✅ Auth configured
✅ App credentials saved
✅ User signed in
✅ Data syncing successfully
