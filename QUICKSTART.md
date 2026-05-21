# SnapVision 快速开始指南

## 📋 项目状态

**✅ 已完成** - 核心功能开发完成

- [x] 项目架构设计和目录结构
- [x] 后端服务器搭建 (Express.js + SQLite)
- [x] 前端页面和交互开发 (HTML + CSS + JS)
- [x] 文件上传和处理
- [x] 技术指标计算 (MACD, 支撑位, 压力位等)
- [x] 数据库设计和初始化
- [x] API 接口实现
- [x] 前端 UI 和图表集成
- [x] 历史记录管理

## 🚀 启动应用

### 方式 1: 使用启动脚本 (推荐)

```bash
cd /Users/mac/Desktop/snapvision

# 确保后端依赖已安装
cd backend && npm install 2>/dev/null; cd ..

# 启动两个服务器
bash start.sh
```

### 方式 2: 手动启动

**终端 1 - 启动后端**

```bash
cd /Users/mac/Desktop/snapvision/backend
PORT=5001 npm start
```

后端运行在: `http://localhost:5001`

**终端 2 - 启动前端**

```bash
cd /Users/mac/Desktop/snapvision/frontend
python3 -m http.server 3000
```

或者:

```bash
node server.js
```

前端运行在: `http://localhost:3000`

## 🌐 访问应用

打开浏览器访问:

```
http://localhost:3000
```

## 📊 功能演示

### 1. 上传 K 线图片

1. 进入首页
2. 拖拽或点击上传图片
3. 建议文件名格式: `600519_贵州茅台.png`

### 2. 查看分析结果

分析完成后，会看到:
- 股票代码和名称
- 当前价格和涨跌幅
- K 线走势图
- 技术指标面板:
  - 支撑位/压力位
  - MACD / 信号线
  - 金叉/死叉信号
  - 交易建议

### 3. 查看历史记录

- 点击"历史"菜单
- 查看所有分析记录
- 点击记录查看详情

### 4. 下载报告

分析完成后，点击"下载报告"按钮下载 JSON 格式的完整报告。

## 📝 API 测试

### 测试健康检查

```bash
curl http://localhost:5001/health
```

输出:
```json
{"status":"ok","timestamp":"2026-05-19T16:08:20.806Z"}
```

### 测试文件上传 (需要真实文件)

```bash
curl -X POST http://localhost:5001/api/analyze \
  -F "file=@/path/to/image.png"
```

### 查询历史记录

```bash
curl http://localhost:5001/api/history?limit=10&offset=0
```

### 获取单个分析

```bash
curl http://localhost:5001/api/analysis/{analysis-id}
```

## 🛠️ 项目结构

```
snapvision/
├── backend/              # Node.js + Express API
│   ├── server.js         # 主服务器
│   ├── package.json      # 依赖配置
│   ├── db/
│   │   ├── schema.sql    # 数据库架构
│   │   ├── database.js   # 数据库连接
│   │   └── snapvision.db # SQLite 数据库
│   ├── routes/           # API 路由
│   ├── controllers/      # 业务逻辑
│   ├── models/           # 数据模型
│   ├── utils/            # 工具函数
│   │   ├── indicators.js # 指标计算
│   │   ├── klineParser.js # K线解析
│   │   └── multerConfig.js # 文件上传
│   └── uploads/          # 上传的图片
│
├── frontend/             # HTML + CSS + JS
│   ├── index.html        # 主页面
│   ├── server.js         # 静态服务器
│   ├── js/
│   │   ├── api.js        # API 客户端
│   │   ├── app.js        # 应用逻辑
│   │   └── chart.js      # 图表管理
│   └── css/              # 样式文件
│
├── README.md             # 项目文档
├── start.sh              # 启动脚本
└── plan.md               # 项目规划

```

## 💾 数据库

**数据库文件**: `backend/db/snapvision.db`

**表结构**:

- `analyses` - 分析记录表
  - id (TEXT PRIMARY KEY)
  - stock_code, stock_name
  - price, change_percent
  - support, resistance
  - macd, signal, macd_histogram
  - crossover, crossover_type
  - analysis, recommendation
  - created_at, updated_at

- `klines` - K线数据表
  - id (INTEGER PRIMARY KEY)
  - analysis_id (外键)
  - date, open, high, low, close, volume

## 🔧 环境配置

**后端环境变量** (`backend/.env`):

```
NODE_ENV=development
PORT=5001
DB_PATH=./db/snapvision.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
FRONTEND_URL=http://localhost:3000
```

## 📈 技术栈

| 项目 | 技术 | 版本 |
|------|------|------|
| 前端框架 | HTML5 + CSS3 + Vanilla JS | - |
| UI框架 | TailwindCSS | 4.x |
| 图表库 | Chart.js | 4.4.0 |
| 后端框架 | Express.js | 4.18.2 |
| 数据库 | SQLite3 | 5.x |
| 文件上传 | Multer | 1.4.5 |
| 运行时 | Node.js | 18+ |

## 🎯 核心功能

### ✅ 已实现

1. **文件上传**
   - 拖拽上传
   - 点击上传
   - 文件验证

2. **数据解析**
   - 从文件名提取股票代码
   - 生成模拟 K 线数据
   - 自动识别股票名称

3. **技术指标**
   - MACD 指标计算
   - 支撑位/压力位检测
   - 金叉/死叉识别
   - 移动平均线 (MA5, MA10)

4. **数据可视化**
   - K 线折线图
   - 技术指标面板
   - 实时数据更新

5. **历史管理**
   - 分析记录保存
   - 分页查询
   - JSON 报告下载

### 📋 待优化 (Phase 4-5)

- 响应式布局完善
- 错误处理增强
- 性能优化
- 更多技术指标
- 真实数据集成

## 🐛 常见问题

### Q: 如何更改端口?

A: 设置环境变量即可

```bash
# 后端
PORT=8000 npm start

# 前端
python3 -m http.server 8080
```

### Q: 数据库文件在哪里?

A: `backend/db/snapvision.db`

### Q: 如何添加新指标?

A: 编辑 `backend/utils/indicators.js`

### Q: 如何连接真实数据源?

A: 修改 `backend/utils/klineParser.js` 中的 `generateMockKlines()` 方法

## 📞 获取帮助

查看详细文档: [README.md](./README.md)

## 📄 许可证

MIT License

---

**开始分析你的股票吧!** 📈✨

运行: `bash start.sh` 然后访问 `http://localhost:3000`
