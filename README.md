# SnapVision Beta v0.3

AI-powered stock chart analysis tool  
AI 股票截图分析工具

SnapVision can recognize stock screenshots using OCR, fetch real-time market data, and generate AI-powered technical analysis.

SnapVision 可以通过 OCR 识别股票截图，结合实时行情 API 与 AI 信号分析，自动生成技术分析结果。

---

# Features 功能

- 📸 OCR stock screenshot recognition  
  股票截图 OCR 识别

- 📈 Real-time market API  
  实时行情 API

- 🧠 AI signal analysis  
  AI 信号分析

- 📊 MA / MACD technical indicators  
  技术指标分析

- 🪟 Apple-inspired Liquid Glass UI  
  Apple 风格 Liquid Glass UI
  
  # 相较于0.2 版本的改动有：

## 新增功能

### 🌱 小白模式

* 自动隐藏复杂专业术语
* 使用更容易理解的人话解释分析结果
* 更适合普通投资者阅读

### 🔬 专业模式

* 显示完整技术指标
* MACD、支撑位、压力位等详细数据
* 提供完整分析报告与信号因子

### 📊 AI 结论卡

* 一句话总结当前股票状态
* 持有建议
* 买入建议
* AI 信心等级

### ⭐ 自选股系统

* 支持添加和管理关注股票
* 快速查看收藏股票分析结果

### ⚠️ 风险解释系统

* AI 自动解释风险来源
* 不再只有“高风险/中风险/低风险”
* 提供具体风险原因

### 🚀 OCR 引擎升级

* OCR 常驻服务架构
* 避免重复加载模型
* 显著提升识别体验
* 稳定性优化

### 🛠 Bug 修复

* 修复专业详情展开后无法继续滚动
* 修复模式切换异常
* 修复 OCR 服务稳定性问题
* 修复请求超时问题
* 修复多个界面交互问题

## 当前状态

SnapVision v0.3 Beta 已进入真实用户测试阶段。

分析结果仅供学习、研究和参考，不构成任何投资建议。


---

SnapVision Beta v0.3 — Mac Quick Start
Requirements
macOS
Node.js 18+
Python 3.10+
Git
1. Clone the project
git clone https://github.com/your-username/snapvision.git
cd snapvision
2. Install dependencies
cd backend
npm install
cd ../frontend
npm install
3. Install Python packages
pip install paddleocr paddlepaddle
4. Run the backend
cd backend
npm run dev
5. Run the frontend

Open a new terminal:

cd frontend
npm run dev
6. Open the app
Frontend: http://localhost:3000 or the port shown in terminal
Follow the on-screen steps to upload a stock screenshot
Notes
This is a local beta version.
OCR and analysis may take a few seconds on first run.
If the OCR model is downloading, wait until it finishes.
Win 版使用教程（English）
SnapVision Beta v0.3 — Windows Quick Start
Requirements
Windows 10 / 11
Node.js 18+
Python 3.10+
Git
1. Clone the project
git clone https://github.com/your-username/snapvision.git
cd snapvision
2. Install dependencies

Open CMD or PowerShell and run:

cd backend
npm install
cd ../frontend
npm install
3. Install Python packages
pip install paddleocr paddlepaddle
4. Run the backend
cd backend
npm run dev
5. Run the frontend

Open a new terminal:

cd frontend
npm run dev
6. Open the app
Frontend: http://localhost:3000 or the port shown in terminal
Upload a stock screenshot and wait for the analysis result
Notes
Make sure Python is added to PATH.
This is a local beta version.
The first OCR run may take longer because models need to be downloaded.

---

# License

MIT License
