# SnapVision 功能测试指南

## 📋 测试清单

本指南帮助您验证 SnapVision 的所有核心功能。

## 🚀 准备工作

### 1. 启动应用

```bash
cd /Users/mac/Desktop/snapvision

# 启动后端和前端
bash start.sh

# 或手动启动
# 终端 1
cd backend && PORT=5001 npm start

# 终端 2
cd frontend && python3 -m http.server 3000
```

### 2. 打开浏览器

访问: **http://localhost:3000**

应该看到:
- ✅ SnapVision logo 和标题
- ✅ 上传区域（拖拽或点击）
- ✅ 导航菜单（分析、历史）

## 🧪 功能测试

### Test 1: 页面加载

**预期结果:**
- [ ] 页面加载成功，无错误
- [ ] 所有样式正确应用（TailwindCSS）
- [ ] 图表库加载完成

**验证方法:**
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签页，确认无红色错误
3. 检查网络标签页，所有资源加载成功

---

### Test 2: 文件上传

**测试步骤:**

1. 创建测试图片文件
2. 准备文件名: `600519_贵州茅台.png`
3. 上传文件到应用

**预期结果:**
- [ ] 文件选择成功
- [ ] 显示"正在分析..."加载状态
- [ ] 后端处理请求

**验证方法:**
1. 观察上传区域显示所选文件名
2. 查看 Network 标签页，POST /api/analyze 请求
3. 确认请求状态为 200

**可能的错误:**
- ❌ "无法连接到服务器" → 后端未启动
- ❌ "文件大小不能超过 10MB" → 文件过大
- ❌ "仅支持 JPEG、PNG..." → 文件格式错误

---

### Test 3: 分析结果显示

**预期结果:**
- [ ] 股票名称和代码显示正确
- [ ] 当前价格和涨跌幅显示
- [ ] K 线图表成功渲染
- [ ] 技术指标面板显示所有数据

**验证方法:**

检查结果面板中的信息:

```
股票名称: 贵州茅台        ✓
代码: 600519              ✓
价格: ¥1642.50            ✓
涨跌: +0.88%              ✓

K 线图表:                 ✓
- 收盘价曲线
- MA5 移动平均线
- MA10 移动平均线

技术指标:
- 支撑位: ¥1600.00        ✓
- 压力位: ¥1680.00        ✓
- MACD: 0.4500             ✓
- 信号线: 0.3800           ✓
- 柱状图: 0.0700           ✓
- 信号: 金叉              ✓
- 建议: 中性               ✓
```

---

### Test 4: 图表交互

**测试步骤:**

1. 将鼠标悬停在图表上的不同点
2. 观察数据提示框
3. 检查图表响应

**预期结果:**
- [ ] 鼠标悬停显示数据提示
- [ ] 图表平滑渲染
- [ ] 无性能问题（卡顿）

---

### Test 5: 历史记录

**测试步骤:**

1. 完成至少一次分析
2. 点击导航菜单中的"历史"
3. 观察历史列表

**预期结果:**
- [ ] 历史列表加载成功
- [ ] 显示之前分析的记录
- [ ] 分页按钮正常工作
- [ ] 可点击历史项查看详情

**验证方法:**

检查历史记录中的字段:
- 股票名称
- 股票代码
- 当前价格
- 涨跌幅
- 信号 (金叉/死叉/无)
- 日期时间

---

### Test 6: 查看历史详情

**测试步骤:**

1. 从历史列表中点击一条记录
2. 观察详情页面

**预期结果:**
- [ ] 返回到分析详情视图
- [ ] 显示该历史记录的完整信息
- [ ] 图表重新渲染

---

### Test 7: 下载报告

**测试步骤:**

1. 完成一次分析
2. 点击"下载报告"按钮

**预期结果:**
- [ ] 下载 JSON 文件
- [ ] 文件名格式: `{股票代码}_{股票名称}_report.json`
- [ ] JSON 格式正确，包含所有数据

**验证 JSON 内容:**

```json
{
  "id": "uuid-string",
  "stock_code": "600519",
  "stock_name": "贵州茅台",
  "price": 1642.5,
  "change_percent": 0.88,
  "support": 1600,
  "resistance": 1680,
  "macd": 0.45,
  "signal": 0.38,
  "macd_histogram": 0.07,
  "crossover": "金叉",
  "crossover_type": "golden_cross",
  "analysis": "分析文本...",
  "recommendation": "中性",
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

---

### Test 8: 重新上传

**测试步骤:**

1. 分析完成后，点击"重新上传"按钮
2. 尝试上传另一个图片

**预期结果:**
- [ ] 清除前一个分析
- [ ] 重置上传区域
- [ ] 可以进行新的分析

---

### Test 9: 响应式设计

**测试步骤:**

1. 打开浏览器开发者工具
2. 切换到不同的视口大小:
   - 手机 (375px)
   - 平板 (768px)
   - 桌面 (1920px)

**预期结果:**
- [ ] 布局在所有设备上正确显示
- [ ] 文本可读
- [ ] 按钮易点击 (最小 44x44px)
- [ ] 无内容溢出

---

### Test 10: 错误处理

**测试步骤:**

测试各种错误场景:

#### 10.1 后端离线

1. 停止后端服务
2. 尝试上传文件

**预期结果:**
- [ ] 显示友好的错误提示
- [ ] 提示: "无法连接到服务器"

#### 10.2 无效文件

1. 尝试上传文本文件 (.txt)
2. 尝试上传超过 10MB 的文件

**预期结果:**
- [ ] 上传前验证
- [ ] 显示相应的错误信息

#### 10.3 网络超时

1. 使用浏览器开发工具限制网速
2. 上传文件

**预期结果:**
- [ ] 应用响应超时
- [ ] 显示错误提示
- [ ] 允许重试

---

## API 测试

### 健康检查

```bash
curl http://localhost:5001/health
```

**预期响应:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-20T22:37:05.902Z"
}
```

### 历史记录

```bash
curl http://localhost:5001/api/history?limit=10&offset=0
```

**预期响应:**
```json
{
  "data": [...],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "pages": 1
  }
}
```

### 搜索

```bash
curl http://localhost:5001/api/search?code=600519&limit=5
```

### 获取详情

```bash
curl http://localhost:5001/api/analysis/{id}
```

---

## 📊 性能测试

### 1. 首屏加载时间

使用 Chrome DevTools Lighthouse:

1. 打开 DevTools (F12)
2. 切换到 Lighthouse 标签页
3. 点击 "Analyze page load"

**目标:**
- ✅ First Contentful Paint (FCP) < 2s
- ✅ Largest Contentful Paint (LCP) < 3s
- ✅ Cumulative Layout Shift (CLS) < 0.1

### 2. 图表渲染性能

1. 完成分析
2. 在 DevTools Performance 标签页录制
3. 记录渲染时间

**目标:**
- ✅ 图表渲染时间 < 500ms

### 3. API 响应时间

```bash
time curl http://localhost:5001/api/history
```

**目标:**
- ✅ 响应时间 < 200ms

---

## 🐛 常见问题排查

### 问题 1: 无法连接到服务器

**症状:** 上传时显示"无法连接到服务器"

**排查步骤:**
```bash
# 检查后端是否运行
curl http://localhost:5001/health

# 如果失败，启动后端
cd backend && PORT=5001 npm start
```

### 问题 2: CORS 错误

**症状:** 浏览器控制台显示 CORS 错误

**排查步骤:**
```bash
# 检查 CORS 配置
cat backend/.env | grep FRONTEND_URL

# 应该显示 FRONTEND_URL=http://localhost:3000
```

### 问题 3: 数据库锁定

**症状:** "database is locked" 错误

**解决方案:**
```bash
# 重新初始化数据库
rm backend/db/snapvision.db
node backend/db/init.js
```

### 问题 4: 文件上传失败

**症状:** 上传文件后显示错误

**排查步骤:**
```bash
# 检查上传目录权限
ls -la backend/uploads/

# 检查文件大小限制
cat backend/.env | grep MAX_FILE_SIZE
```

---

## 📝 测试报告模板

将以下信息记录下来:

```
SnapVision 测试报告
==================

测试日期: 2026-05-20
测试环境: macOS 13.x, Chrome 120.x
后端版本: 1.0.0
前端版本: 1.0.0

功能测试结果:
- [ ] 页面加载: PASS/FAIL
- [ ] 文件上传: PASS/FAIL
- [ ] 分析结果: PASS/FAIL
- [ ] 图表显示: PASS/FAIL
- [ ] 历史记录: PASS/FAIL
- [ ] 错误处理: PASS/FAIL
- [ ] 响应式设计: PASS/FAIL

API 测试结果:
- [ ] Health Check: PASS/FAIL
- [ ] History: PASS/FAIL
- [ ] Search: PASS/FAIL
- [ ] Analysis Detail: PASS/FAIL

性能指标:
- FCP: ___ ms
- LCP: ___ ms
- 图表渲染: ___ ms
- API 响应: ___ ms

问题记录:
1. ...
2. ...
3. ...

总体评分: __/10

签名: _______________
```

---

## ✅ 完成清单

- [ ] 所有功能测试通过
- [ ] 所有 API 测试通过
- [ ] 性能指标达标
- [ ] 无生产环境阻塞 Bug
- [ ] 文档完整

祝测试顺利! 🧪✨
