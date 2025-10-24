#!/bin/bash

# DauphinDash Deployment Script
# This script helps you deploy your dashboard to GitHub Pages

echo "🚀 DauphinDash Deployment Helper"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
    echo ""
fi

# Check if files exist
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found!"
    echo "Make sure you're in the DauphinDash directory"
    exit 1
fi

echo "📋 Current status:"
git status --porcelain
echo ""

# Add all files
echo "📦 Adding files to git..."
git add .
echo "✅ Files added"
echo ""

# Check if this is the first commit
if [ -z "$(git log --oneline 2>/dev/null)" ]; then
    COMMIT_MSG="Initial commit: DauphinDash dashboard"
    echo "🎉 First commit detected"
else
    COMMIT_MSG="Update DauphinDash dashboard"
    echo "🔄 Updating existing repository"
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"
echo "✅ Changes committed"
echo ""

# Check if remote exists
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "🔗 No remote repository found!"
    echo ""
    echo "To connect to GitHub:"
    echo "1. Create a new repository on GitHub.com"
    echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo "3. Run: git push -u origin main"
    echo ""
    echo "Then enable GitHub Pages in your repository settings!"
    exit 0
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main
echo "✅ Pushed to GitHub!"
echo ""

# Get repository URL
REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
GITHUB_PAGES_URL=$(echo $REPO_URL | sed 's/github\.com/YOUR_USERNAME.github.io/')

echo "🎉 Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to your repository: $REPO_URL"
echo "2. Click 'Settings' → 'Pages'"
echo "3. Select 'Deploy from a branch' → 'main' → 'Save'"
echo "4. Wait 2-3 minutes for GitHub to build your site"
echo "5. Visit: https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
echo ""
echo "🔧 Need help? Check DEPLOYMENT.md for detailed instructions!"
