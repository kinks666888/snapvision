# SnapVision Beta v0.2

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
http://localhost:3000
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


Windows 版使用教程
# Requirements 环境要求

Please install the following first:

请先安装以下环境：

---

## 1. Install Node.js

Download:
下载：

:contentReference[oaicite:0]{index=0}

Recommended:
建议安装：

```text
Node.js >= 18
```

After installation, check:

安装完成后检查：

```bash
node -v
npm -v
```

---

## 2. Install Python

Download:
下载：

:contentReference[oaicite:1]{index=1}

Recommended:
建议安装：

```text
Python 3.10+
```

IMPORTANT:
安装时务必勾选：

```text
Add Python to PATH
```

Check installation:

```bash
python --version
```

---

# Install PaddleOCR 安装 PaddleOCR

Open CMD or PowerShell:

打开 CMD 或 PowerShell：

```bash
pip install paddleocr paddlepaddle
```

---

# Clone Project 克隆项目

```bash
git clone https://github.com/你的用户名/snapvision.git
cd snapvision
```

---

# Install Dependencies 安装依赖

## Backend

```bash
cd backend
npm install
```

---

## Frontend

```bash
cd ../frontend
npm install
```

---

# Start Backend 启动后端

```bash
cd backend
npm run dev
```

Backend default:
后端默认地址：

```text
http://localhost:5000
```

---

# Start Frontend 启动前端

Open a new terminal:

打开新的终端：

```bash
cd frontend
npm run dev
```

Frontend default:
前端默认地址：

```text
http://localhost:5173
```

---

# Usage 使用方法

1. Open browser 打开浏览器

```text
http://localhost:5173
```

2. Upload stock screenshot  
上传股票截图

3. Wait for OCR + AI analysis  
等待 OCR 与 AI 分析

---

# Common Issues 常见问题

## OCR very slow OCR 很慢

First startup may download OCR models.

首次运行会下载 OCR 模型，属于正常现象。

---

## Port already in use 端口占用

Change backend port:

修改后端端口：

```bash
set PORT=5001 && npm run dev
```

---

## Python not found

Reinstall Python and enable:

重新安装 Python 并勾选：

```text
Add Python to PATH
```

---

# Current Status 当前状态

Beta / Developer Preview

- Local deployment only  
  当前仅支持本地运行

- Mobile devices not supported yet  
  暂未适配移动端

- OCR optimization still in progress  
  OCR 仍在持续优化

---

# License

MIT License
