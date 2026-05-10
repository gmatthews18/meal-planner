#!/bin/bash
# Script to commit and push the configuration files to GitHub

# Use the mounted path in bash sandbox
REPO_DIR="/sessions/charming-vigilant-babbage/mnt/meal-planner"
cd "$REPO_DIR" || exit 1

# Remove any stale lock files
rm -f .git/index.lock 2>/dev/null

# Stage all files
git add -A

# Show what's staged
echo "Files to be committed:"
git diff-index --cached --name-only HEAD --

# Commit
git commit -m "Add configuration files: package.json, index.js, index.css, public/index.html, .gitignore, and GitHub Actions workflow"

# Push to GitHub
git push origin main

echo "Done! Files pushed to GitHub."
