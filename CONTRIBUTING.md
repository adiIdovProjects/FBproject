# Contributing Guide

## Setup (One Time)

1. Install Git: https://git-scm.com/downloads
2. Install VS Code: https://code.visualstudio.com/
3. Open terminal and run:
   ```
   git clone git@github.com:adiIdovProjects/FBproject.git
   ```
4. Open the folder in VS Code

## Making Changes

**Step 1** - Always get latest code first:
```
git pull
```

**Step 2** - Make your changes (edit files with AI)

**Step 3** - Save and push:
```
git add .
git commit -m "Describe what you changed"
git pull
git push
```

**Step 4** - Wait ~2 minutes, check live site

## Important Rules

1. **Always `git pull` before starting work**
2. **Always `git pull` before pushing**
3. **Tell each other when you're working** (avoid editing same file)

## If You Get an Error

If git says "conflict" or "rejected":
1. Don't panic
2. Run `git pull`
3. Ask AI to help fix the conflict
4. Then `git push` again

## Quick Reference

| When | Command |
|------|---------|
| Start working | `git pull` |
| Save changes | `git add .` then `git commit -m "message"` |
| Upload changes | `git pull` then `git push` |
| See what changed | `git status` |
