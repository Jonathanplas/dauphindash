# 🚀 Deploying DauphinDash to GitHub Pages

Follow these steps to get your dashboard live on GitHub Pages:

## Method 1: Simple Deployment (Recommended)

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** button in the top right → **"New repository"**
3. Name your repository (e.g., `dauphindash` or `my-dashboard`)
4. Make it **Public** (required for free GitHub Pages)
5. **Don't** initialize with README (we already have files)
6. Click **"Create repository"**

### Step 2: Upload Your Files
```bash
# Navigate to your project folder
cd /Users/jonathanplas/Desktop/DauphinDash

# Initialize git repository
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit: DauphinDash dashboard"

# Add your GitHub repository as remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll down to **"Pages"** section (in the left sidebar)
4. Under **"Source"**, select **"Deploy from a branch"**
5. Choose **"main"** branch and **"/ (root)"** folder
6. Click **"Save"**

### Step 4: Access Your Dashboard
- GitHub will build your site (takes 1-2 minutes)
- Your dashboard will be available at:
  ```
  https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
  ```

## Method 2: Using GitHub Actions (Advanced)

If you want automatic deployments on every push:

### Step 1: Enable GitHub Actions
1. In your repository, go to **Settings** → **Pages**
2. Under **"Source"**, select **"GitHub Actions"**
3. The workflow file (`.github/workflows/deploy.yml`) is already included!

### Step 2: Push Changes
```bash
git add .
git commit -m "Add GitHub Actions deployment"
git push
```

## 🔧 Troubleshooting

### Common Issues:

**"Page build failed"**
- Make sure `index.html` is in the root directory
- Check that all file paths are correct
- Ensure no syntax errors in your files

**"404 Not Found"**
- Wait 5-10 minutes for GitHub to build the site
- Check the repository name matches the URL
- Make sure the repository is public

**"Site not updating"**
- Clear your browser cache
- Check the Actions tab for build status
- Try pushing a small change to trigger rebuild

### Check Build Status:
1. Go to your repository → **"Actions"** tab
2. Look for green checkmarks ✅ or red X's ❌
3. Click on failed builds to see error details

## 🎯 Quick Test

After deployment, test your dashboard:
1. ✅ Page loads without errors
2. ✅ You can add weight data
3. ✅ You can add LeetCode problems
4. ✅ You can check workout checkbox
5. ✅ Data saves and persists
6. ✅ Contribution graph displays

## 🔄 Updating Your Dashboard

To make changes:
```bash
# Edit your files locally
# Then commit and push
git add .
git commit -m "Update dashboard features"
git push
```

GitHub Pages will automatically rebuild and deploy your changes!

## 📱 Custom Domain (Optional)

Want a custom domain like `mydashboard.com`?
1. Buy a domain from any registrar
2. In your repository Settings → Pages
3. Add your domain under "Custom domain"
4. Follow GitHub's DNS setup instructions

---

**Need help?** Check the [GitHub Pages documentation](https://docs.github.com/en/pages) or create an issue in your repository!
