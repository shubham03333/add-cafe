# Updating Existing PM2 Deployment on EC2

Since you're already running the app with PM2, here's how to update your existing deployment:

## Current Status
- ✅ App running with PM2
- ✅ Port 3000 configuration
- ✅ Database connected

## For Updates/Changes

### 1. Update Application Code

```bash
# On your EC2 instance
cd /path/to/your/cafe-orders

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Build the application
npm run build
```

### 2. Restart with PM2

```bash
# Check current PM2 processes
pm2 list

# Restart your app (replace 'cafe-orders' with your actual PM2 app name)
pm2 restart cafe-orders

# Or if you need to reload for zero-downtime
pm2 reload cafe-orders

# Check status
pm2 status
```

### 3. Environment Variables Update

If you need to update environment variables:

```bash
# Edit your .env.local file
nano .env.local

# After changes, restart the app
pm2 restart cafe-orders
```

### 4. Database Migration

If you have new database changes:

```bash
# Run your migration scripts
mysql -h your-rds-endpoint -u your_user -p your_database < scripts/your-new-migration.sql
```

## PM2 Management Commands

```bash
# View logs
pm2 logs cafe-orders

# Monitor resources
pm2 monit

# View app status
pm2 show cafe-orders

# Stop app
pm2 stop cafe-orders

# Delete app
pm2 delete cafe-orders

# Save current PM2 configuration
pm2 save
```

## Troubleshooting

### If app won't start:
```bash
# Check logs for errors
pm2 logs cafe-orders --lines 50

# Check if port 3000 is available
netstat -tlnp | grep :3000

# Test build
npm run build
```

### If database connection fails:
```bash
# Test database connection
mysql -h your-rds-endpoint -u your_user -p -e "SELECT 1"

# Check environment variables
pm2 show cafe-orders
```

### Memory/Restart Issues:
```bash
# Check resource usage
pm2 monit

# View restart history
pm2 show cafe-orders
```

## Backup Strategy

```bash
# Database backup
mysqldump -h your-rds-endpoint -u your_user -p your_database > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app-backup-$(date +%Y%m%d).tar.gz /path/to/cafe-orders
```

## Monitoring

```bash
# Set up log rotation
pm2 install pm2-logrotate

# View real-time logs
pm2 logs cafe-orders --lines 100 -f
```

## Your Current Setup

Based on your current configuration:
- **Port**: 3000 ✅
- **PM2**: Already configured ✅
- **Database**: Connected ✅
- **Build**: Using turbopack ✅

The main tasks for updates are:
1. Pull latest code
2. Run `npm install` if dependencies changed
3. Run `npm run build`
4. Run `pm2 restart cafe-orders`

That's it! Your existing PM2 and Nginx configuration should handle the rest.
