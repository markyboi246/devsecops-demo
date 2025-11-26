# DevSecOps Learning Project - Complete Setup Guide

This guide will walk you through setting up and coding each phase of the DevSecOps pipeline.

## Prerequisites

Before you begin, ensure you have:
- Git installed
- Node.js (v18+) and npm installed
- Docker Desktop installed and running
- A GitHub account
- Text editor or IDE (VS Code recommended)

---

## Part 1: Initial Project Setup

### Step 1: Navigate to the project
```bash
cd C:\Users\marcu\devsecops-demo
```

### Step 2: Initialize Git repository
```bash
git init
git add .
git commit -m "Initial commit: DevSecOps learning project"
```

### Step 3: Create a GitHub repository
1. Go to https://github.com/new
2. Name it `devsecops-demo`
3. DO NOT initialize with README (we already have files)
4. Click "Create repository"

### Step 4: Push to GitHub
```bash
git remote add origin https://github.com/YOUR-USERNAME/devsecops-demo.git
git branch -M main
git push -u origin main
```

---

## Part 2: Docker Configuration (Already Created!)

The Docker files are already created for you. Here's what they do:

### Files Created:
- **Dockerfile**: Multi-stage build for production
  - Stage 1: Builds React frontend
  - Stage 2: Prepares backend dependencies
  - Stage 3: Creates final production image with non-root user

- **docker-compose.yml**: Orchestrates services
  - Backend service on port 3001
  - Health checks configured
  - Ready for database addition

- **.dockerignore**: Excludes unnecessary files from Docker build

### Test Docker Setup:
```bash
# Build the Docker image
docker build -t devsecops-demo .

# Run with docker-compose
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

---

## Part 3: Phase 1 - Code Security (SAST + SCA)

Create the file: `.github/workflows/phase1-code-security.yml`

### What you'll learn:
- Static Application Security Testing (SAST) with Semgrep
- Software Composition Analysis (SCA) with Trivy
- Dependency scanning with npm audit
- Failing builds on high-severity issues

### Step-by-step coding:

**Step 1: Create the workflow file**
```bash
mkdir -p .github/workflows
touch .github/workflows/phase1-code-security.yml
```

**Step 2: Open the file and add the workflow structure**
```yaml
name: "Phase 1: Code Security (SAST + SCA)"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:  # Allows manual trigger

jobs:
  # We'll add jobs here
```

**Step 3: Add Semgrep SAST scanning job**
```yaml
  semgrep-sast:
    name: Semgrep SAST Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/javascript
            p/nodejs
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        continue-on-error: false  # Fail the build on findings
```

**Step 4: Add npm audit for backend**
```yaml
  npm-audit-backend:
    name: NPM Audit - Backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run npm audit
        working-directory: ./backend
        run: |
          npm audit --audit-level=high
          # This will fail if high or critical vulnerabilities found
```

**Step 5: Add npm audit for frontend**
```yaml
  npm-audit-frontend:
    name: NPM Audit - Frontend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run npm audit
        working-directory: ./frontend
        run: npm audit --audit-level=high
```

**Step 6: Add Trivy SCA scanning**
```yaml
  trivy-sca:
    name: Trivy Dependency Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner in fs mode
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail on findings

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

**Step 7: Add ESLint security scanning**
```yaml
  eslint-security:
    name: ESLint Security Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci

      - name: Install ESLint security plugins
        run: |
          npm install -g eslint-plugin-security

      - name: Run ESLint on backend
        working-directory: ./backend
        run: |
          npx eslint . --ext .js --format json --output-file eslint-backend.json || true

      - name: Run ESLint on frontend
        working-directory: ./frontend
        run: |
          npx eslint . --ext .js,.jsx --format json --output-file eslint-frontend.json || true

      - name: Upload ESLint results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: eslint-results
          path: |
            backend/eslint-backend.json
            frontend/eslint-frontend.json
```

### Test Phase 1:
```bash
git add .github/workflows/phase1-code-security.yml
git commit -m "Add Phase 1: Code Security workflow"
git push
```

Go to your GitHub repository → Actions tab to see the workflow run!

---

## Part 4: Phase 2 - Runtime Security (DAST)

Create the file: `.github/workflows/phase2-runtime-security.yml`

### What you'll learn:
- Dynamic Application Security Testing with OWASP ZAP
- Container security scanning
- Testing running applications for vulnerabilities

### Step-by-step coding:

**Step 1: Create the workflow file**
```bash
touch .github/workflows/phase2-runtime-security.yml
```

**Step 2: Add workflow structure**
```yaml
name: "Phase 2: Runtime Security (DAST)"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 1'  # Run weekly on Mondays at 2 AM

jobs:
  # We'll add jobs here
```

**Step 3: Add Docker image build and scan**
```yaml
  docker-build-and-scan:
    name: Build and Scan Docker Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: devsecops-demo:${{ github.sha }}
          load: true

      - name: Run Trivy container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: devsecops-demo:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-container-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy container scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-container-results.sarif'
```

**Step 4: Add OWASP ZAP baseline scan**
```yaml
  zap-baseline:
    name: OWASP ZAP Baseline Scan
    runs-on: ubuntu-latest
    needs: docker-build-and-scan

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build application
        run: |
          docker build -t devsecops-demo:test .

      - name: Start application container
        run: |
          docker run -d --name app -p 3001:3001 devsecops-demo:test
          sleep 10  # Wait for app to start

      - name: Verify application is running
        run: |
          curl -f http://localhost:3001/health || exit 1

      - name: Run ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:3001'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Stop application container
        if: always()
        run: docker stop app && docker rm app
```

**Step 5: Add OWASP ZAP full scan (optional - more thorough)**
```yaml
  zap-full-scan:
    name: OWASP ZAP Full Scan
    runs-on: ubuntu-latest
    needs: docker-build-and-scan
    if: github.event_name == 'workflow_dispatch' || github.event_name == 'schedule'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build and start application
        run: |
          docker build -t devsecops-demo:test .
          docker run -d --name app -p 3001:3001 devsecops-demo:test
          sleep 10

      - name: Run ZAP Full Scan
        uses: zaproxy/action-full-scan@v0.10.0
        with:
          target: 'http://localhost:3001'
          allow_issue_writing: false

      - name: Stop application
        if: always()
        run: docker stop app && docker rm app

      - name: Upload ZAP scan results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-full-scan-report
          path: report_html.html
```

**Step 6: Create ZAP rules file** (optional customization)
```bash
mkdir -p .zap
touch .zap/rules.tsv
```

Add to `.zap/rules.tsv`:
```
# ZAP Scanning Rules
# Format: rule-id	WARN|FAIL|IGNORE
10021	WARN	# X-Content-Type-Options
10023	WARN	# Information Disclosure
10096	IGNORE	# Timestamp Disclosure
```

### Test Phase 2:
```bash
git add .github/workflows/phase2-runtime-security.yml
git add .zap/
git commit -m "Add Phase 2: Runtime Security workflow"
git push
```

---

## Part 5: Phase 3 - Secrets & Configuration Management

Create the file: `.github/workflows/phase3-secrets.yml`

### What you'll learn:
- Scanning for secrets in code with GitLeaks
- Preventing credential leaks with TruffleHog
- Best practices for secrets management

### Step-by-step coding:

**Step 1: Create the workflow file**
```bash
touch .github/workflows/phase3-secrets.yml
```

**Step 2: Add workflow structure**
```yaml
name: "Phase 3: Secrets & Configuration Security"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  # We'll add jobs here
```

**Step 3: Add GitLeaks secret scanning**
```yaml
  gitleaks:
    name: GitLeaks Secret Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better detection

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

**Step 4: Add TruffleHog scanning**
```yaml
  trufflehog:
    name: TruffleHog Secret Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified
```

**Step 5: Add custom secret patterns check**
```yaml
  custom-secret-check:
    name: Custom Secret Pattern Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check for common secret patterns
        run: |
          echo "Checking for hardcoded secrets..."

          # Check for common secret patterns
          if grep -r -i "password.*=.*['\"].*['\"]" --include="*.js" --include="*.jsx" .; then
            echo "⚠️ Found potential hardcoded passwords"
            exit 1
          fi

          if grep -r "api[_-]key.*=.*['\"][a-zA-Z0-9]\{20,\}" --include="*.js" --include="*.jsx" .; then
            echo "⚠️ Found potential API keys"
            exit 1
          fi

          if grep -r "sk_live_" --include="*.js" --include="*.jsx" .; then
            echo "⚠️ Found potential Stripe live keys"
            exit 1
          fi

          if grep -r "AKIA[0-9A-Z]\{16\}" --include="*.js" --include="*.jsx" .; then
            echo "⚠️ Found potential AWS access keys"
            exit 1
          fi

          echo "✓ No obvious secrets found in code"
```

**Step 6: Add environment file check**
```yaml
  env-file-check:
    name: Check for .env Files
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Verify .env files are not committed
        run: |
          if find . -name ".env" -not -path "./node_modules/*" | grep -q .; then
            echo "❌ ERROR: .env file found in repository!"
            echo "These files should never be committed:"
            find . -name ".env" -not -path "./node_modules/*"
            exit 1
          else
            echo "✓ No .env files found in repository"
          fi

      - name: Check .gitignore includes .env
        run: |
          if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
            echo "⚠️ WARNING: .env not found in .gitignore"
            echo "Adding .env to .gitignore is recommended"
          else
            echo "✓ .env is properly ignored"
          fi
```

**Step 7: Create .gitignore file to prevent secret commits**
```bash
touch .gitignore
```

Add to `.gitignore`:
```
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
coverage/

# Logs
*.log
npm-debug.log*

# Secret files
*.pem
*.key
secrets.yml
credentials.json
```

### Test Phase 3:
```bash
git add .github/workflows/phase3-secrets.yml
git add .gitignore
git commit -m "Add Phase 3: Secrets scanning workflow"
git push
```

**Important**: The workflow will detect the hardcoded secrets in `server.js` - this is intentional for learning!

---

## Part 6: Phase 4 - Continuous Feedback & Reporting

Create the file: `.github/workflows/phase4-reporting.yml`

### What you'll learn:
- Aggregating security scan results
- Creating security dashboards
- Setting up notifications
- Adding status badges

### Step-by-step coding:

**Step 1: Create the workflow file**
```bash
touch .github/workflows/phase4-reporting.yml
```

**Step 2: Add workflow structure**
```yaml
name: "Phase 4: Security Reporting & Notifications"

on:
  workflow_run:
    workflows: ["Phase 1: Code Security (SAST + SCA)", "Phase 2: Runtime Security (DAST)", "Phase 3: Secrets & Configuration Security"]
    types:
      - completed
  workflow_dispatch:

jobs:
  # We'll add jobs here
```

**Step 3: Add security summary report job**
```yaml
  generate-security-report:
    name: Generate Security Summary
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        continue-on-error: true

      - name: Generate security report
        run: |
          cat > security-report.md << 'EOF'
          # 🔒 Security Scan Summary Report

          **Generated**: $(date)
          **Repository**: ${{ github.repository }}
          **Branch**: ${{ github.ref_name }}
          **Commit**: ${{ github.sha }}

          ---

          ## 📊 Scan Results Overview

          | Phase | Scanner | Status |
          |-------|---------|--------|
          | Phase 1 | Semgrep SAST | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 1 | Trivy SCA | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 1 | NPM Audit | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 2 | OWASP ZAP | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 2 | Container Scan | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 3 | GitLeaks | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |
          | Phase 3 | TruffleHog | ${{ github.event.workflow_run.conclusion == 'success' && '✅ Passed' || '❌ Failed' }} |

          ---

          ## 🔍 Detailed Findings

          ### High Priority Issues
          - Review SARIF files in GitHub Security tab
          - Check artifacts for detailed scan reports

          ### Recommendations
          1. Fix all CRITICAL and HIGH severity issues
          2. Review and remediate secrets found in code
          3. Update vulnerable dependencies
          4. Apply security patches

          ---

          ## 📈 Trend Analysis

          **Previous Scans**: View workflow history for trends

          **Security Score**: Calculate based on findings

          EOF

          cat security-report.md

      - name: Upload security report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: security-report.md
```

**Step 4: Add GitHub Issue creation for findings**
```yaml
  create-security-issue:
    name: Create Security Issue
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'

    steps:
      - name: Create issue for failed security scan
        uses: actions/github-script@v7
        with:
          script: |
            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Security Scan Failed - ' + new Date().toISOString().split('T')[0],
              body: `## Security Scan Failure Alert

              **Workflow**: ${{ github.event.workflow_run.name }}
              **Run ID**: ${{ github.event.workflow_run.id }}
              **Triggered by**: ${{ github.event.workflow_run.triggering_actor.login }}
              **Commit**: ${{ github.event.workflow_run.head_sha }}

              ### Action Required

              One or more security scans have failed. Please review the workflow run and address the findings.

              [View Workflow Run](https://github.com/${{ github.repository }}/actions/runs/${{ github.event.workflow_run.id }})

              ### Next Steps

              1. Review the failed workflow logs
              2. Check the Security tab for SARIF uploads
              3. Download and review scan artifacts
              4. Fix identified vulnerabilities
              5. Re-run the security scans

              ---

              *This issue was automatically created by the Security Reporting workflow*
              `,
              labels: ['security', 'automated']
            });

            console.log('Created issue:', issue.data.html_url);
```

**Step 5: Add job summary to GitHub Actions**
```yaml
  publish-job-summary:
    name: Publish Job Summary
    runs-on: ubuntu-latest

    steps:
      - name: Publish security summary to job
        run: |
          echo "# 🔒 Security Pipeline Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status**: ${{ github.event.workflow_run.conclusion }}" >> $GITHUB_STEP_SUMMARY
          echo "**Date**: $(date)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "## Quick Links" >> $GITHUB_STEP_SUMMARY
          echo "- [Security Tab](https://github.com/${{ github.repository }}/security)" >> $GITHUB_STEP_SUMMARY
          echo "- [Code Scanning](https://github.com/${{ github.repository }}/security/code-scanning)" >> $GITHUB_STEP_SUMMARY
          echo "- [Dependabot](https://github.com/${{ github.repository }}/security/dependabot)" >> $GITHUB_STEP_SUMMARY
```

**Step 6: Add Slack notification (optional)**
```yaml
  slack-notification:
    name: Send Slack Notification
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        if: env.SLACK_WEBHOOK_URL != ''
        with:
          status: ${{ github.event.workflow_run.conclusion }}
          text: |
            Security Scan ${{ github.event.workflow_run.conclusion }}
            Repository: ${{ github.repository }}
            Branch: ${{ github.ref_name }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Step 7: Create a comprehensive status badge workflow**
```bash
touch .github/workflows/security-badge.yml
```

Add to `security-badge.yml`:
```yaml
name: Security Status Badge

on:
  workflow_run:
    workflows: ["Phase 1: Code Security (SAST + SCA)"]
    types:
      - completed

jobs:
  update-badge:
    runs-on: ubuntu-latest
    steps:
      - name: Create badge
        uses: schneegans/dynamic-badges-action@v1.7.0
        with:
          auth: ${{ secrets.GIST_SECRET }}
          gistID: YOUR_GIST_ID_HERE
          filename: devsecops-badge.json
          label: Security Scans
          message: ${{ github.event.workflow_run.conclusion == 'success' && 'passing' || 'failing' }}
          color: ${{ github.event.workflow_run.conclusion == 'success' && 'green' || 'red' }}
```

### Test Phase 4:
```bash
git add .github/workflows/phase4-reporting.yml
git add .github/workflows/security-badge.yml
git commit -m "Add Phase 4: Security reporting and notifications"
git push
```

---

## Part 7: Setting Up GitHub Secrets (Required!)

Some workflows require secrets to be configured in GitHub.

### Step 1: Go to your GitHub repository
1. Click on "Settings"
2. Go to "Secrets and variables" → "Actions"
3. Click "New repository secret"

### Step 2: Add these secrets (as needed):

**Optional but recommended:**
- `SEMGREP_APP_TOKEN`: Get from https://semgrep.dev (free account)
- `SLACK_WEBHOOK_URL`: If you want Slack notifications
- `GIST_SECRET`: For creating status badges

### Step 3: Enable GitHub Advanced Security (if available)
1. Go to Settings → Code security and analysis
2. Enable "Dependency graph"
3. Enable "Dependabot alerts"
4. Enable "Code scanning" (if available)

---

## Part 8: Testing the Complete Pipeline

### Test 1: Run all workflows manually
```bash
# Go to Actions tab in GitHub
# Click on each workflow
# Click "Run workflow" → "Run workflow"
```

### Test 2: Make a code change to trigger workflows
```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test: Trigger security workflows"
git push
```

### Test 3: Check the results
1. Go to "Actions" tab
2. Watch all workflows run
3. Check for failures (there will be some - intentional vulnerabilities!)
4. Go to "Security" tab → "Code scanning alerts"
5. Review the findings

---

## Part 9: Understanding the Vulnerabilities

Your application has **intentional vulnerabilities** for learning:

### Backend Vulnerabilities:
1. ✅ Hardcoded JWT secret
2. ✅ Hardcoded API keys
3. ✅ SQL injection in login
4. ✅ SQL injection in search
5. ✅ Insecure CORS
6. ✅ Command injection
7. ✅ IDOR (Insecure Direct Object Reference)
8. ✅ Mass assignment
9. ✅ Exposed stack traces
10. ✅ Missing authentication
11. ✅ Insufficient logging

### Frontend Vulnerabilities:
1. ✅ Token in localStorage (XSS risk)
2. ✅ XSS via dangerouslySetInnerHTML
3. ✅ No input sanitization
4. ✅ No CSRF protection
5. ✅ Logging sensitive data

---

## Part 10: Fixing Vulnerabilities (Learning Exercise)

Try fixing these one by one and watch the security scans improve!

### Fix Example 1: Remove hardcoded secrets
```javascript
// Before (in server.js):
const JWT_SECRET = 'super-secret-key-12345';

// After:
const JWT_SECRET = process.env.JWT_SECRET || 'default-for-dev-only';
```

### Fix Example 2: Prevent SQL injection
```javascript
// Before:
const query = `SELECT * FROM users WHERE username = '${username}'`;

// After:
const query = 'SELECT * FROM users WHERE username = ?';
db.get(query, [username], (err, user) => { ... });
```

### Fix Example 3: Add authentication middleware
```javascript
// Add this middleware:
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Use it:
app.get('/api/users', authenticate, (req, res) => { ... });
```

---

## Part 11: Next Steps & Advanced Topics

Once you've mastered the basics, try:

1. **Add more scanners**:
   - CodeQL (GitHub's semantic code analysis)
   - Snyk (advanced SCA)
   - SonarQube (code quality + security)

2. **Add infrastructure scanning**:
   - Checkov for IaC security
   - Terraform security scanning

3. **Implement security gates**:
   - Require all scans to pass before merge
   - Set severity thresholds

4. **Add metrics and dashboards**:
   - Track security debt over time
   - Visualize trends

5. **Integrate with your IDE**:
   - Pre-commit hooks with Husky
   - Real-time security linting

---

## Troubleshooting

### Workflows not running?
- Check that workflows are enabled: Settings → Actions → "Allow all actions"
- Ensure you've pushed to the correct branch

### npm audit failing?
- Expected! The app has vulnerable dependencies for learning
- Try: `npm audit fix` to auto-fix some issues

### Docker build failing?
- Make sure Docker Desktop is running
- Check Docker has enough resources allocated

### Secrets not working?
- Some workflows will work without secrets
- Semgrep can run without token (but limited)
- TruffleHog and GitLeaks work without configuration

---

## Summary

You now have a complete DevSecOps pipeline with:
- ✅ SAST scanning (Semgrep)
- ✅ SCA scanning (Trivy, npm audit)
- ✅ DAST scanning (OWASP ZAP)
- ✅ Secret scanning (GitLeaks, TruffleHog)
- ✅ Container scanning
- ✅ Automated reporting
- ✅ Issue creation
- ✅ Security badges

**Practice by**:
1. Running all the scans
2. Reading the results
3. Fixing vulnerabilities one by one
4. Watching the security posture improve

Happy learning! 🚀🔒
