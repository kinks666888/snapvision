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

SnapVision Beta v0.2 — Mac Quick Start
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
SnapVision Beta v0.2 — Windows Quick Start
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
