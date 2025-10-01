# Production Deployment Guide

This guide covers the production deployment process for the Leave Tracker App with comprehensive monitoring and observability.

## Pre-Deployment Checklist

### 1. Environment Variables Validation

Before deploying, ensure all required environment variables are configured:

```bash
# Required for Production
DATABASE_URL="postgresql://user:pass@host:5432/leave_tracker"
NEXTAUTH_SECRET="secure-32-character-minimum-secret"
NEXTAUTH_URL="https://your-domain.com"
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="noreply@your-domain.com"
EMAIL_REPLY_TO="admin@your-domain.com"
ENABLE_EMAIL_NOTIFICATIONS="true"

# Optional but Recommended
HEALTH_CHECK_TOKEN="secure-health-check-token"
LOG_LEVEL="info"
METRICS_ENABLED="true"
EMAIL_RATE_LIMIT_PER_HOUR="100"
EMAIL_RETRY_ATTEMPTS="3"
EMAIL_TIMEOUT_MS="30000"
```

### 2. Run Production Readiness Check

```bash
# Test environment validation locally first
NODE_ENV=production npm run build

# Check the readiness endpoint after deployment
curl https://your-domain.com/api/readiness?token=your-health-check-token
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Build and Run with Docker

```bash
# Build production image
docker build -f docker/Dockerfile.production -t leave-tracker-app .

# Run with environment file
docker run -d \
  --name leave-tracker \
  --env-file .env.production \
  -p 3000:3000 \
  leave-tracker-app
```

#### Docker Compose (Production)

```bash
# Copy environment template
cp .env.example .env.production

# Edit with production values
nano .env.production

# Deploy with Docker Compose
docker-compose -f docker/docker-compose.production.yml up -d
```

### Option 2: Platform-as-a-Service Deployment

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables through Vercel dashboard or CLI
vercel env add RESEND_API_KEY
vercel env add NEXTAUTH_SECRET
# ... add all required variables
```

#### Netlify / Railway / Render

1. Connect your Git repository
2. Set build command: `npm run build`
3. Set output directory: `.next`
4. Configure environment variables in the platform dashboard

### Option 3: VPS/Cloud Server

```bash
# Install Node.js 18+ and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2

# Clone and build
git clone <your-repo>
cd leave-tracker-app
npm ci --production
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health check
curl https://your-domain.com/api/health

# Detailed health check (requires token)
curl "https://your-domain.com/api/health?level=detailed&token=your-health-token"

# Deep health check with metrics
curl "https://your-domain.com/api/health?level=deep&token=your-health-token"
```

### 2. Production Readiness

```bash
# Check production readiness
curl "https://your-domain.com/api/readiness?token=your-health-token"

# Should return status: "ready" or "warnings"
```

### 3. Email Service Verification

```bash
# Test email functionality through the app
# Or check email service status in health endpoint
curl "https://your-domain.com/api/health?level=detailed" | jq '.services.email'
```

## Monitoring and Observability

### 1. Health Monitoring

Set up monitoring to check these endpoints:

- **Basic Health**: `GET /api/health` (every 30s)
- **Readiness**: `GET /api/readiness` (every 5min)
- **Metrics**: `GET /api/metrics` (every 1min if enabled)

### 2. Log Monitoring

The application logs to stdout/stderr with structured logging:

```bash
# View logs in Docker
docker logs leave-tracker-app -f

# View logs with PM2
pm2 logs leave-tracker-app
```

### 3. Alert Configuration

Set up alerts for:

- Health check failures (503 status)
- Email service failures
- Database connectivity issues
- High memory usage (>80% of container limit)
- Long response times (>2s for health checks)

## Security Considerations

### 1. Environment Variables

- Use strong, unique secrets (32+ characters)
- Rotate NEXTAUTH_SECRET periodically
- Secure email API keys
- Use HEALTH_CHECK_TOKEN for monitoring endpoints

### 2. HTTPS Configuration

Ensure HTTPS is properly configured:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Database Security

- Use connection pooling
- Enable SSL connections
- Regular backups
- Restrict database access by IP

## Performance Optimization

### 1. Caching

The application includes optimized caching headers for:
- Static assets (1 year)
- API responses (appropriate cache-control)
- Health endpoints (no-cache)

### 2. Database Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_start_date ON leave_requests(start_date);
```

### 3. Monitoring Performance

Use the metrics endpoint to monitor:

```bash
curl "https://your-domain.com/api/metrics?token=your-token" | jq '{
  memory: .memory,
  uptime: .uptime,
  healthCheckDuration: .performance.healthCheckDuration
}'
```

## Troubleshooting

### Common Issues

1. **Email Service Not Working**
   ```bash
   # Check configuration
   curl "/api/health?level=detailed" | jq '.services.email'
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   curl "/api/health?level=deep" | jq '.services.database'
   ```

3. **Environment Variable Problems**
   ```bash
   # Check validation
   curl "/api/readiness" | jq '.configuration'
   ```

### Log Analysis

Look for these patterns in logs:

- `❌ Environment validation failed:` - Configuration issues
- `🚨 Production deployment blocked` - Critical environment problems
- `⚠️ Rate limit exceeded` - Email rate limiting
- `Email service error` - Resend API issues

## Maintenance

### 1. Regular Tasks

- Monitor health endpoints daily
- Check email delivery rates weekly
- Review error logs weekly
- Update dependencies monthly
- Backup database daily

### 2. Updates

```bash
# Test updates in staging first
git pull origin main
npm ci
npm run build
npm run test

# Deploy with zero-downtime
pm2 reload ecosystem.config.js --env production
```

### 3. Scaling

For increased load:

1. Enable horizontal scaling (multiple instances)
2. Use Redis for rate limiting (replace in-memory store)
3. Implement database read replicas
4. Add CDN for static assets

## Support

For deployment issues:

1. Check the readiness endpoint first
2. Review application logs
3. Verify all environment variables
4. Test email service configuration
5. Check database connectivity

The production-ready configuration includes comprehensive error handling, monitoring, and observability features to ensure reliable operation.