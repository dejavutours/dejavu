# Deployment Guide

This document describes the automated deployment process for the dejavu application on AWS EC2.

## Overview

Deployment is fully automated via GitHub Actions. When code is merged into the `main` branch, GitHub Actions automatically:
1. Connects to the EC2 instance via SSH
2. Executes the `deploy.sh` script
3. Updates code, installs dependencies, and restarts the application

## Prerequisites

### GitHub Secrets Configuration

**Important**: GitHub Secrets are different from application environment variables. GitHub Secrets are used by GitHub Actions to authenticate and connect to your EC2 instance. Application environment variables (like those in your `.env.production` file) are used by your Node.js application at runtime.

The following secrets **must** be configured in your GitHub repository settings before automated deployment will work:

- `EC2_HOST`: Your EC2 instance public IP or hostname (required)
- `EC2_USER`: SSH username (typically `ubuntu`, optional - defaults to `ubuntu`)
- `EC2_SSH_KEY`: Private SSH key for authentication (required)
- `EC2_PORT`: SSH port (optional, defaults to 22)

#### Step-by-Step Guide to Configure GitHub Secrets

1. **Navigate to Repository Settings**
   - Go to your GitHub repository
   - Click on **Settings** (top navigation bar)
   - In the left sidebar, click **Secrets and variables** → **Actions**

2. **Add EC2_HOST Secret**
   - Click **New repository secret**
   - Name: `EC2_HOST`
   - Value: Your EC2 instance's public IP address (e.g., `54.123.45.67`) or hostname
   - Click **Add secret**

3. **Add EC2_USER Secret** (Optional)
   - Click **New repository secret**
   - Name: `EC2_USER`
   - Value: Your SSH username (typically `ubuntu` for Ubuntu instances, `ec2-user` for Amazon Linux)
   - Click **Add secret**
   - **Note**: If not set, the workflow will default to `ubuntu`

4. **Add EC2_SSH_KEY Secret** (Required)
   - Click **New repository secret**
   - Name: `EC2_SSH_KEY`
   - Value: Your **private** SSH key content (the entire key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
   - Click **Add secret**
   - **Important**: This is your private key file content (usually `~/.ssh/id_rsa` or `~/.ssh/your-key.pem`)

5. **Add EC2_PORT Secret** (Optional)
   - Click **New repository secret**
   - Name: `EC2_PORT`
   - Value: SSH port number (default is `22`)
   - Click **Add secret**

#### How to Get Your SSH Private Key

If you're using an AWS EC2 key pair:

```bash
# On your local machine, view your private key
cat ~/.ssh/your-key.pem

# Or if using a different location
cat /path/to/your/private-key.pem
```

Copy the **entire** output including the header and footer lines (`-----BEGIN` and `-----END`).

**Security Note**: Never commit your private SSH key to the repository. Always use GitHub Secrets for this purpose.

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

**Important Distinction**: 
- **GitHub Secrets** (configured in GitHub repository settings) are used by GitHub Actions for deployment
- **Environment Variables** (stored in `.env.production` file on EC2) are used by your Node.js application

Ensure you have the following environment files on your EC2 instance:
- `.env.production` - Production environment variables (e.g., MongoDB connection, AWS credentials, etc.)
- `.env` - Development environment variables (optional, for local development)

**Note**: Your application's environment variables (like `AWS_ACCESS_KEY`, `MONGO_DB`, etc.) should be stored in `.env.production` on the EC2 server, NOT in GitHub Secrets. GitHub Secrets are only for deployment authentication.

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

**Issue**: "Error: missing server host" or "missing server host"
- **Cause**: The `EC2_HOST` secret is not configured or is empty
- **Solution**: 
  1. Go to your repository → Settings → Secrets and variables → Actions
  2. Verify `EC2_HOST` secret exists and contains your EC2 instance IP address
  3. If missing, add it following the [GitHub Secrets Configuration](#github-secrets-configuration) guide above
  4. Re-run the failed workflow by pushing a new commit or manually triggering it

**Issue**: "Error: missing private key" or SSH authentication fails
- **Cause**: The `EC2_SSH_KEY` secret is not configured or contains invalid key content
- **Solution**:
  1. Verify `EC2_SSH_KEY` secret exists in GitHub Secrets
  2. Ensure the entire private key is copied (including `-----BEGIN` and `-----END` lines)
  3. Verify the key matches the public key on your EC2 instance
  4. Test SSH connection manually: `ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip`

**Issue**: SSH connection fails (timeout or connection refused)
- **Solution**: 
  1. Verify `EC2_HOST` contains the correct IP address or hostname
  2. Check EC2 security group allows SSH (port 22) from GitHub Actions IPs
  3. Verify EC2 instance is running and accessible
  4. Test SSH connection manually from your local machine
  5. If using a custom port, ensure `EC2_PORT` secret is set correctly

**Issue**: Script execution fails
- **Solution**: Check GitHub Actions logs for specific error
- Verify `deploy.sh` exists and is executable on EC2 (`chmod +x deploy.sh`)
- Ensure script has correct paths and permissions
- Check that the application directory exists at `/var/www/dejavu`

**Issue**: Validation step fails with "EC2_HOST secret is not configured"
- **Cause**: Required secrets are missing
- **Solution**: Follow the [GitHub Secrets Configuration](#github-secrets-configuration) guide to add all required secrets

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

