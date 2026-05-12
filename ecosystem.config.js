module.exports = {
  apps: [
    {
      name: 'erepair-shop',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/epladmin/erepair',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/epladmin/erepair/logs/pm2-error.log',
      out_file: '/home/epladmin/erepair/logs/pm2-out.log',
      log_file: '/home/epladmin/erepair/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'erepair-quote-reminders',
      script: 'node_modules/.bin/tsx',
      args: 'scripts/process-quote-reminders.ts',
      cwd: '/home/epladmin/erepair',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/epladmin/erepair/logs/pm2-error.log',
      out_file: '/home/epladmin/erepair/logs/pm2-out.log',
      log_file: '/home/epladmin/erepair/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
