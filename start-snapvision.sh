#!/bin/bash
# SnapVision 一键启动脚本
# 先启动后端 (FastAPI)，再启动前端 (Vite + React)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend-python"
FRONTEND_DIR="$SCRIPT_DIR/frontend-v2"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}   SnapVision - 股票图表分析平台 启动脚本       ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# ─── Check DEEPSEEK_API_KEY ──────────────────────────
if [ -z "$DEEPSEEK_API_KEY" ]; then
  # Try loading from .env file
  if [ -f "$BACKEND_DIR/.env" ]; then
    export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
  fi
  if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${YELLOW}[警告] 未设置 DEEPSEEK_API_KEY 环境变量${NC}"
    echo -e "${YELLOW}       可以在 backend-python/.env 文件中设置，或直接 export${NC}"
    echo ""
  fi
fi

# ─── Install backend dependencies ────────────────────
echo -e "${GREEN}[1/4] 安装后端 Python 依赖...${NC}"
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
echo -e "${GREEN}       ✓ 后端依赖安装完成${NC}"

# ─── Install frontend dependencies ───────────────────
echo -e "${GREEN}[2/4] 安装前端 Node 依赖...${NC}"
cd "$FRONTEND_DIR"
npm install --silent
echo -e "${GREEN}       ✓ 前端依赖安装完成${NC}"

# ─── Start backend ───────────────────────────────────
echo -e "${GREEN}[3/4] 启动后端服务 (端口 8000)...${NC}"
cd "$BACKEND_DIR"
source venv/bin/activate
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}       ✓ 后端已启动 PID=$BACKEND_PID${NC}"
sleep 2

# ─── Start frontend ──────────────────────────────────
echo -e "${GREEN}[4/4] 启动前端服务 (端口 5173)...${NC}"
cd "$FRONTEND_DIR"
npx vite --host &
FRONTEND_PID=$!
echo -e "${GREEN}       ✓ 前端已启动 PID=$FRONTEND_PID${NC}"
sleep 3

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}   SnapVision 启动成功！${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "  后端 API:  ${CYAN}http://localhost:8000${NC}"
echo -e "  健康检查:  ${CYAN}http://localhost:8000/health${NC}"
echo -e "  前端页面:  ${CYAN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}  按 Ctrl+C 停止所有服务${NC}"
echo ""

# ─── Trap Ctrl+C to cleanup ───────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}正在停止服务...${NC}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID 2>/dev/null
  wait $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}服务已停止${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
