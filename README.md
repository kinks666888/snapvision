# SnapVision Beta

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

---

# Tech Stack 技术栈

## Frontend
- React
- Vite
- TailwindCSS

## Backend
- Node.js
- Express
- SQLite

## AI / OCR
- PaddleOCR
- DeepSeek

---

# Project Structure 项目结构

```bash
SnapVision/
├── backend/
├── frontend/
├── README.md
```

---

# Getting Started 启动项目

## 1. Clone project 克隆项目

```bash
git clone https://github.com/你的用户名/snapvision.git
cd snapvision
```

---

## 2. Install dependencies 安装依赖

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

# Start Project 启动项目

## Start backend 启动后端

```bash
cd backend
npm run dev
```

默认运行：
Default:

```bash
http://localhost:5000
```

---

## Start frontend 启动前端

```bash
cd frontend
npm run dev
```

默认运行：
Default:

```bash
http://localhost:5173
```

---

# Requirements 环境要求

- Node.js >= 18
- Python >= 3.10
- PaddleOCR

---

# Install PaddleOCR 安装 OCR

```bash
pip install paddleocr paddlepaddle
```

---

# Notes 注意事项

- 当前版本为 Beta / Developer Preview
- 暂时仅支持本地运行
- 暂未适配移动端
- 部分 OCR 场景仍在优化中

Current version is still under active development.

---

# Roadmap

- AI signal engine
- Market sentiment analysis
- Better OCR accuracy
- Desktop application
- Cloud deployment

---

# License

MIT License
