# 🚀 Deployment Guide

## ✅ Pre-Deployment Checklist

- [ ] Docker Desktop installed and running (for local testing)
- [ ] API key from Anthropic
- [ ] Git repository ready (GitHub/GitLab)
- [ ] `.env` file configured (don't commit this!)

## 🏠 Local Testing

**Before deploying to Dokploy, test locally first!**

### Step 1: Start Docker Desktop
- Open Docker Desktop application
- Wait for it to fully start (green icon)

### Step 2: Setup Environment
```bash
cp .env.example .env
# Edit .env with your real API key
```

### Step 3: Build and Test (LOCAL)
```bash
# IMPORTANT: Use docker-compose.local.yml for local testing
docker-compose -f docker-compose.local.yml up --build

# Or use the test script
./test-docker.sh
```

**Why two docker-compose files?**
- `docker-compose.local.yml` - Exposes ports for localhost:3000
- `docker-compose.yml` - Configured for Dokploy's Traefik reverse proxy (no port binding)

### Step 4: Verify at localhost:3000
- Open **http://localhost:3000** (MUST work locally)
- Drop a test invoice
- Check it processes correctly
- Download CSV to verify data

### Step 5: Stop
```bash
docker-compose -f docker-compose.local.yml down
```

## ☁️ Deploy to Dokploy

### 1. Push to Git
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Create App in Dokploy
1. Login to Dokploy dashboard
2. Click **"Create Application"**
3. Choose **"Docker Compose"**
4. Connect your Git repository
5. Select the repository with invoice-mypak

### 3. Configure Environment
Add these environment variables in Dokploy:

```
ANTHROPIC_BASE_URL=https://20250731.xyz/claude
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_API_KEY=cr_your_actual_key_here
```

### 4. Deployment Settings
- **Build Path**: `/`
- **Docker Compose File**: `docker-compose.yml`
- **Port**: `3000`
- **Health Check**: Enable
- **Health Check Path**: `/`

### 5. Deploy
- Click **"Deploy"**
- Wait for build to complete (3-5 minutes first time)
- Check logs for any errors

### 6. Configure Domain (Optional)
- Add your custom domain in Dokploy
- Point DNS to Dokploy server
- Enable SSL/HTTPS

## 🔍 Troubleshooting

### Build Fails
- Check Dokploy build logs
- Verify environment variables are set
- Ensure Docker files are correct

### App Won't Start
- Check runtime logs in Dokploy
- Verify API key is valid
- Check if ports 3000/8000 are available

### Can't Access App
- Verify firewall allows port 3000
- Check Dokploy routing configuration
- Ensure domain DNS is correct

### Images Won't Process
- Check API key is correct
- Verify network can reach API endpoint
- Check logs for API errors

## 📊 Monitoring

### In Dokploy Dashboard:
- Check CPU/Memory usage
- Monitor logs for errors
- Watch request counts

### Health Check:
```bash
curl http://your-domain.com/
# Should return 200 OK
```

## 🔄 Updates

### Deploy New Version:
1. Make changes locally
2. Test with `docker-compose up --build`
3. Commit and push to Git
4. Dokploy auto-deploys (if enabled) or click "Redeploy"

### Rollback:
- In Dokploy, go to Deployments
- Select previous successful deployment
- Click "Rollback"

## 💾 Backups

### Database/State:
- Dokploy persists `./data` volume
- Download backups from Dokploy volume manager

### Uploaded Files:
- Files in `./uploaded_files` are persisted
- Can be cleared via app UI

## 🔐 Security Checklist

- [ ] API key in environment variables (not hardcoded)
- [ ] `.env` in `.gitignore`
- [ ] HTTPS enabled (SSL certificate)
- [ ] Rate limiting enabled
- [ ] Regular backups scheduled

## 📞 Support

If stuck:
1. Check Dokploy logs
2. Verify environment variables
3. Test locally first
4. Check GitHub issues
