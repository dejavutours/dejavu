# Deployment Guide

This document describes the automated deployment process for the dejavu application on AWS EC2.

## Overview

Deployment is fully automated via GitHub Actions. When code is merged into the `main` branch, GitHub Actions automatically:
1. Connects to the EC2 instance via SSH
2. Executes the `deploy.sh` script
3. Updates code, installs dependencies, and restarts the application

## Prerequisites

### GitHub Secrets Configuration

The following secrets must be configured in your GitHub repository settings (Settings → Secrets and variables → Actions):

- `EC2_HOST`: Your EC2 instance public IP or hostname
- `EC2_USER`: SSH username (typically `ubuntu`)
- `EC2_SSH_KEY`: Private SSH key for authentication
- `EC2_PORT`: SSH port (optional, defaults to 22)

### EC2 Setup

1. **SSH Key Pair**: Ensure you have SSH access to your EC2 instance
2. **Application Directory**: Application should be located at `/var/www/dejavu`
3. **Git Repository**: The directory should be a git repository with `main` branch
4. **Node.js**: Node.js 20.x should be installed via nvm
5. **Forever**: Forever process manager should be installed globally
6. **Deploy Script**: The `deploy.sh` script should be placed at `/var/www/dejavu/deploy.sh` and made executable

## Initial Setup on EC2

### 1. Install Required Tools

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20.x
nvm install 20
nvm use 20

# Install forever globally
npm install -g forever
```

### 2. Setup Application Directory

```bash
# Create application directory
sudo mkdir -p /var/www/dejavu
sudo chown ubuntu:ubuntu /var/www/dejavu

# Clone repository (if not already cloned)
cd /var/www/dejavu
git clone <your-repo-url> .

# Copy deploy.sh script to server
# (Upload deploy.sh from your local machine or copy from repository)
chmod +x deploy.sh
```

### 3. Configure Environment

Ensure you have the following environment files:
- `.env.production` - Production environment variables
- `.env` - Development environment variables (optional)

### 4. Test Manual Deployment

Before enabling automated deployment, test the script manually:

```bash
cd /var/www/dejavu
bash deploy.sh
```

Verify that:
- Application starts successfully
- Forever process is running
- Application is accessible on port 5000

## Automated Deployment

### How It Works

1. **Developer pushes to main branch** → GitHub receives the push
2. **GitHub Actions triggers** → Workflow runs on push to `main`
3. **SSH connection established** → GitHub Actions connects to EC2
4. **Deploy script executes** → `deploy.sh` runs on the server
5. **Application restarts** → Forever restarts the application

### Deployment Process

The `deploy.sh` script performs the following steps:

1. Navigate to `/var/www/dejavu`
2. Load nvm environment
3. Fetch latest code from GitHub
4. Checkout `main` branch for `package-lock.json`
5. Pull latest changes
6. Use Node.js 20.x via nvm
7. Validate EJS file paths (case-sensitivity check)
8. Install dependencies (`npm ci --production`)
9. Stop forever process gracefully
10. Kill any process on port 5000 (cleanup)
11. Start application with forever
12. Verify deployment success
13. Display recent logs

### Monitoring Deployments

#### GitHub Actions

View deployment status in the GitHub Actions tab:
- Green checkmark = Deployment successful
- Red X = Deployment failed (check logs)

#### EC2 Logs

View application logs on the server:

```bash
# View forever logs
tail -n 100 /home/ubuntu/.forever/dejavutours.log

# View forever process list
forever list

# View all forever logs
forever logs dejavutours
```

## Troubleshooting

### Deployment Fails in GitHub Actions

**Issue**: SSH connection fails
- **Solution**: Verify `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY` secrets are correct
- Check EC2 security group allows SSH from GitHub Actions IPs
- Verify SSH key has correct permissions

**Issue**: Script execution fails
- **Solution**: Check GitHub Actions logs for specific error
- Verify `deploy.sh` exists and is executable on EC2
- Ensure script has correct paths and permissions

### Application Fails to Start

**Issue**: Forever process doesn't start
- **Solution**: Check logs at `/home/ubuntu/.forever/dejavutours.log`
- Verify Node.js 20.x is available via nvm
- Check for syntax errors in application code
- Verify environment variables are set correctly

**Issue**: Port 5000 already in use
- **Solution**: The deploy script should handle this automatically
- Manually kill process: `sudo kill -9 $(sudo lsof -t -i:5000)`
- Check if another instance is running: `forever list`

### EJS Case-Sensitivity Errors

**Issue**: Deployment fails with EJS validation errors
- **Solution**: Ensure all EJS files use lowercase filenames
- Verify all `res.render()` calls use lowercase paths matching filenames
- Check controller files for case mismatches

### Dependencies Installation Fails

**Issue**: `npm ci` fails
- **Solution**: Check `package-lock.json` is up to date
- Verify Node.js version matches `package.json` engines requirement
- Check for network issues or npm registry problems

## Manual Deployment (Fallback)

If automated deployment fails, you can deploy manually:

```bash
# SSH into EC2
ssh ubuntu@<your-ec2-ip>

# Navigate to application directory
cd /var/www/dejavu

# Run deployment script
bash deploy.sh
```

Or perform steps manually:

```bash
cd /var/www/dejavu
git fetch
git checkout main -- package-lock.json
git pull origin main
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20.x
forever stop dejavutours
sudo kill -9 $(sudo lsof -t -i:5000)
npm ci --production
forever start --uid "dejavutours" -a -c "npm run start:prod" ./
forever list
tail -n 100 /home/ubuntu/.forever/dejavutours.log
```

## Best Practices

1. **Always test locally** before pushing to main
2. **Review changes** in pull requests before merging
3. **Monitor logs** after deployment
4. **Keep secrets secure** - never commit SSH keys or credentials
5. **Use feature branches** - only merge to main when ready for production
6. **Check deployment status** after each merge to main

## Security Considerations

- SSH keys are stored as GitHub Secrets (encrypted)
- Deploy script runs with appropriate user permissions
- No sensitive data is logged in deployment logs
- Forever process runs with correct user context
- Environment variables are loaded from `.env.production` file

## Rollback Procedure

If a deployment introduces issues:

```bash
# SSH into EC2
ssh ubuntu@<your-ec2-ip>

# Navigate to application directory
cd /var/www/dejavu

# Revert to previous commit
git log  # Find the previous good commit hash
git checkout <previous-commit-hash>

# Restart application
forever stop dejavutours
forever start --uid "dejavutours" -a -c "npm run start:prod" ./
```

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Check EC2 application logs
3. Verify all prerequisites are met
4. Review this documentation

