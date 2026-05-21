# SnapVision 部署指南

## 目录
- [系统要求](#系统要求)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 系统要求

### 开发环境
- Node.js 18.0.0 或更高版本
- npm 8.0.0 或更高版本
- Python 3.6+ (用于前端静态服务)
- 任何现代网络浏览器

### 生产环境
- Linux/Unix 服务器或 Docker 容器
- Node.js 18+ LTS
- PostgreSQL 12+ (可选，用于替代 SQLite)
- Nginx (作为反向代理)

## 本地开发

### 快速启动

```bash
cd /Users/mac/Desktop/snapvision

# 安装后端依赖
cd backend && npm install && cd ..

# 启动两个服务器
bash start.sh
```

然后访问: **http://localhost:3000**

### 手动启动

**终端 1 - 后端 API**

```bash
cd backend
PORT=5001 npm start

# 或用 nodemon 实时重载
npm run dev
```

**终端 2 - 前端静态服务**

```bash
cd frontend

# 方式 1: Python HTTP 服务器 (推荐)
python3 -m http.server 3000

# 方式 2: Node.js 服务器
node server.js
```

## 生产部署

### Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend
COPY backend ./backend
WORKDIR ./backend
RUN npm ci --only=production

# Copy frontend
COPY frontend ../frontend

EXPOSE 5001

CMD ["npm", "start"]
```

构建和运行:

```bash
docker build -t snapvision .
docker run -p 5001:5001 -e PORT=5001 snapvision
```

### Nginx 反向代理配置

创建 `/etc/nginx/sites-available/snapvision`:

```nginx
upstream snapvision_api {
    server localhost:5001;
}

upstream snapvision_frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://snapvision_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://snapvision_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://snapvision_api/uploads/;
    }
}
```

启用配置:

```bash
sudo ln -s /etc/nginx/sites-available/snapvision /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### PM2 进程管理

安装 PM2:

```bash
npm install -g pm2
```

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'snapvision-backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DB_PATH: './db/snapvision.db'
      }
    },
    {
      name: 'snapvision-frontend',
      script: './frontend/server.js',
      env: {
        PORT: 3000
      }
    }
  ]
};
```

启动:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

查看日志:

```bash
pm2 logs snapvision-backend
pm2 logs snapvision-frontend
pm2 monit
```

## 故障排除

### 后端无法启动

**错误**: `Error: listen EADDRINUSE: address already in use :::5001`

**解决方案**:

```bash
# 查找占用端口的进程
lsof -i :5001

# 杀死进程
kill -9 <PID>

# 或使用不同的端口
PORT=5002 npm start
```

### 前端无法连接后端

**错误**: `无法连接到服务器`

**检查清单**:

1. 后端是否正在运行?
   ```bash
   curl http://localhost:5001/health
   ```

2. CORS 配置是否正确?
   - 检查 `backend/.env` 中的 `FRONTEND_URL`

3. API URL 是否正确?
   - 检查 `frontend/js/api.js` 中的 `API_BASE_URL`

### 数据库错误

**错误**: `Error: database is locked`

**解决方案**:

```bash
# 删除数据库并重新初始化
rm backend/db/snapvision.db
node backend/db/init.js
```

### 文件上传失败

**错误**: `413 Payload Too Large`

**解决方案**:

增加 `backend/.env` 中的 `MAX_FILE_SIZE`:

```
MAX_FILE_SIZE=52428800  # 50MB
```

## 性能优化

### 后端优化

1. **启用数据库连接池**

修改 `backend/db/database.js`:

```javascript
const options = {
  poolSize: 10
};
```

2. **启用缓存**

```bash
npm install redis
```

集成 Redis 缓存历史记录。

3. **启用压缩**

```javascript
const compression = require('compression');
app.use(compression());
```

### 前端优化

1. **启用 Gzip 压缩**

在 Nginx 配置中:

```nginx
gzip on;
gzip_types text/plain text/css application/json;
gzip_min_length 1000;
```

2. **CDN 优化**

```html
<!-- 使用 CDN 版本的库 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
```

3. **懒加载图片**

```html
<img src="..." loading="lazy" alt="...">
```

### 数据库优化

1. **添加索引** (已在 `schema.sql` 中)

2. **定期清理旧数据**

```sql
DELETE FROM analyses WHERE created_at < datetime('now', '-90 days');
```

3. **备份策略**

```bash
# 每日备份
0 2 * * * cp /path/to/snapvision.db /backup/snapvision_$(date +%Y%m%d).db
```

## 监控和日志

### 后端日志

配置 Winston 日志:

```bash
npm install winston
```

### 性能监控

```bash
# 使用 PM2 监控
pm2 plus

# 或使用 StrongLoop Arc
npm install -g strongloop
arc
```

## 升级指南

### 升级依赖

```bash
cd backend
npm outdated    # 查看过期包
npm update      # 更新包
npm audit fix   # 修复安全问题
```

### 数据库迁移 (SQLite → PostgreSQL)

1. 导出数据:
   ```bash
   npm install pg
   node scripts/migrate-to-postgres.js
   ```

2. 更新连接字符串:
   ```
   DATABASE_URL=postgresql://user:password@host/dbname
   ```

## 安全性建议

1. **启用 HTTPS**

使用 Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

2. **验证上传文件**

```javascript
const fileType = require('file-type');
const buffer = await file.buffer();
const type = await fileType.fromBuffer(buffer);
```

3. **速率限制**

```bash
npm install express-rate-limit
```

4. **SQL 注入防护**

使用参数化查询 (已实现)

5. **CORS 配置**

严格限制允许的来源

## 支持和反馈

有问题? 查看:
- 项目文档: [README.md](./README.md)
- 快速指南: [QUICKSTART.md](./QUICKSTART.md)

---

祝你部署顺利! 🚀
