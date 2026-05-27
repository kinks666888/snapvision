# SnapVision | 智能看盘助手

一个现代化的股票分析平台，支持 K 线图上传、AI 识别、技术指标分析和历史记录管理。

## 📦 项目架构

```
snapvision/
├── frontend/          # 前端应用 (HTML + CSS + JS)
│   ├── index.html     # 主页面
│   ├── server.js      # 前端静态服务
│   ├── css/
│   ├── js/
│   │   ├── api.js     # API 客户端
│   │   ├── chart.js   # 图表管理
│   │   └── app.js     # 主应用逻辑
│   └── assets/
├── backend/           # 后端 API (Node.js + Express)
│   ├── server.js      # Express 主文件
│   ├── package.json
│   ├── .env           # 环境变量
│   ├── db/
│   │   ├── schema.sql # 数据库架构
│   │   ├── database.js # 数据库连接
│   │   ├── init.js    # 初始化脚本
│   │   └── snapvision.db # SQLite 数据库文件
│   ├── routes/
│   │   └── analyze.js # 分析路由
│   ├── controllers/
│   │   └── analysisController.js # 业务逻辑
│   ├── models/
│   │   └── analysis.js # 数据模型
│   ├── utils/
│   │   ├── indicators.js # 技术指标计算
│   │   ├── klineParser.js # K 线解析
│   │   └── multerConfig.js # 文件上传配置
│   └── uploads/       # 上传的图片存储
└── README.md          # 项目说明
```

## 🚀 快速开始

### 前置条件

- Node.js 18+
- npm 或 yarn

### 安装与运行

#### 1. 后端服务

```bash
cd backend

# 安装依赖
npm install

# 初始化数据库
node db/init.js

# 启动后端服务 (http://localhost:5001)
npm start

# 开发模式 (自动重启)
npm run dev
```

#### 2. 前端服务

在新的终端窗口：

```bash
cd frontend

# 启动前端静态服务 (http://localhost:3000)
node server.js

# 或使用 Python 快速服务
python3 -m http.server 3000
```

#### 3. 访问应用

打开浏览器访问: **http://localhost:3000**

## 📚 API 文档

### 1. 分析接口

**请求**

```http
POST /api/analyze
Content-Type: multipart/form-data

file: <image_file>
```

**响应**

```json
{
  "id": "uuid-1",
  "stock_code": "600519",
  "stock_name": "贵州茅台",
  "price": 1642.50,
  "change_percent": 0.88,
  "support": 1600.00,
  "resistance": 1680.00,
  "macd": 0.45,
  "signal": 0.38,
  "macd_histogram": 0.07,
  "crossover": "金叉",
  "crossover_type": "golden_cross",
  "analysis": "股票处于震荡阶段，短期有反弹动力...",
  "recommendation": "中性",
  "image_path": "/uploads/600519_贵州茅台-1234567890.png",
  "kline": [
    {
      "date": "2026-05-12",
      "open": 1600,
      "high": 1640,
      "low": 1590,
      "close": 1620,
      "volume": 5000000
    }
  ]
}
```

### 2. 历史记录接口

**请求**

```http
GET /api/history?limit=10&offset=0
```

**响应**

```json
{
  "data": [
    {
      "id": "uuid-1",
      "stock_code": "600519",
      "stock_name": "贵州茅台",
      "price": 1642.50,
      "change_percent": 0.88,
      "support": 1600.00,
      "resistance": 1680.00,
      "macd": 0.45,
      "signal": 0.38,
      "macd_histogram": 0.07,
      "crossover": "金叉",
      "crossover_type": "golden_cross",
      "analysis": "...",
      "recommendation": "中性",
      "created_at": "2026-05-19T23:54:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "pages": 5
  }
}
```

### 3. 分析详情接口

**请求**

```http
GET /api/analysis/:id
```

**响应**

```json
{
  "id": "uuid-1",
  "stock_code": "600519",
  "stock_name": "贵州茅台",
  "price": 1642.50,
  "change_percent": 0.88,
  "support": 1600.00,
  "resistance": 1680.00,
  "macd": 0.45,
  "signal": 0.38,
  "macd_histogram": 0.07,
  "crossover": "金叉",
  "crossover_type": "golden_cross",
  "analysis": "...",
  "recommendation": "中性",
  "image_path": "/uploads/...",
  "kline_data": [...],
  "klines": [...],
  "created_at": "2026-05-19T23:54:00.000Z",
  "updated_at": "2026-05-19T23:54:00.000Z"
}
```

### 4. 搜索接口

**请求**

```http
GET /api/search?code=600519&limit=10&offset=0
```

**响应**

```json
{
  "data": [...],
  "query": "600519"
}
```

## 💡 技术栈

### 前端

- **HTML5** - 页面结构
- **TailwindCSS** - UI 样式框架
- **Chart.js** - K 线图表绘制
- **原生 JavaScript** - 应用逻辑

### 后端

- **Node.js** - 运行环境
- **Express.js** - Web 框架
- **SQLite3** - 数据库
- **Multer** - 文件上传处理
- **UUID** - 唯一 ID 生成

## 📊 核心功能

### 1. 图片上传与识别

- ✅ 支持拖拽和点击上传
- ✅ 自动从文件名识别股票代码（格式: `600519_贵州茅台.png`）
- ✅ 文件验证（大小、格式）

### 2. 技术指标分析

- ✅ **MACD** - 动量震荡指标
- ✅ **支撑位/压力位** - 基于历史高低点
- ✅ **金叉/死叉** - MACD 信号线交叉检测
- ✅ **移动平均线** - MA5、MA10 趋势线

### 3. 数据可视化

- ✅ K 线图表（折线图展示）
- ✅ 实时指标展示
- ✅ 移动平均线叠加

### 4. 历史管理

- ✅ 分析历史记录保存
- ✅ 分页查询历史
- ✅ 搜索特定股票分析
- ✅ JSON 报告下载

## 🔧 配置说明

### 后端环境变量 (.env)

```
NODE_ENV=development
PORT=5000
DB_PATH=./db/snapvision.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
FRONTEND_URL=http://localhost:3000
```

- `PORT` - API 服务端口
- `DB_PATH` - SQLite 数据库路径
- `UPLOAD_DIR` - 文件上传目录
- `MAX_FILE_SIZE` - 最大文件大小（字节）
- `FRONTEND_URL` - 前端 URL（CORS）

## 📈 使用示例

### 1. 上传图片分析

```javascript
// 前端自动处理
// 1. 拖拽或点击选择图片
// 2. 系统自动上传并分析
// 3. 展示分析结果和图表
```

### 2. 查看历史记录

```
导航菜单 -> 历史 -> 查看分析历史列表
点击历史项 -> 查看详细分析
```

### 3. 下载报告

```
分析完成后 -> 点击"下载报告"按钮 -> 获得 JSON 格式报告
```

## 🎨 前端特性

- 响应式设计（支持手机、平板、桌面）
- 现代化 UI（TailwindCSS）
- 流畅动画和过渡效果
- 实时数据更新
- 离线友好的设计

## 🛠️ 开发指南

### 添加新的技术指标

编辑 `backend/utils/indicators.js`：

```javascript
static customIndicator(prices) {
  // 实现你的指标计算逻辑
  return { /* 返回指标结果 */ };
}
```

### 修改图表样式

编辑 `frontend/js/chart.js` 中的 `Chart` 配置。

### 数据库扩展

编辑 `backend/db/schema.sql` 添加新表，然后运行 `node db/init.js`。

## 📝 文件名约定

上传的图片文件名建议遵循以下格式：

```
{股票代码}_{股票名称}.{扩展名}

示例:
600519_贵州茅台.png
000858_五粮液.jpg
601318_中国平安.gif
```

如果文件名不符合格式，系统会返回 `UNKNOWN` 代码。

## 🐛 常见问题

### Q: 如何连接真实数据源？

A: 修改 `backend/utils/klineParser.js` 中的 `generateMockKlines()` 方法，集成真实 API（如 Tushare、同花顺）。

### Q: 如何添加用户认证？

A: 在 `backend/routes` 中添加认证中间件，参考 Express 官方文档。

### Q: 如何部署到生产环境？

A: 
1. 使用 PM2 或 Docker 管理后端进程
2. 前端使用 Nginx 或 CDN 分发
3. 数据库迁移到 PostgreSQL（可选）
4. 配置环境变量和反向代理

## 📄 许可证

MIT License

## 👨‍💻 作者

SnapVision Team

---

**快乐分析！** 📈✨
