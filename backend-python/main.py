import os
import json
import time
import hashlib
import asyncio
from datetime import datetime
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn

# ─── Cache Manager ─────────────────────────────────────────────
class CacheManager:
    def __init__(self, ttl: int = 86400):
        self._cache: dict = {}
        self._lock = Lock()
        self._ttl = ttl  # 24 hours

    def get(self, key: str):
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if time.time() - entry["timestamp"] < self._ttl:
                    return entry["data"]
                del self._cache[key]
            return None

    def set(self, key: str, data: dict):
        with self._lock:
            self._cache[key] = {"data": data, "timestamp": time.time()}

    def cleanup(self):
        with self._lock:
            now = time.time()
            expired = [k for k, v in self._cache.items() if now - v["timestamp"] >= self._ttl]
            for k in expired:
                del self._cache[k]

cache = CacheManager()

# ─── FastAPI App ───────────────────────────────────────────────
app = FastAPI(title="SnapVision Stock Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    image_base64: str
    region_type: str  # "kline" or "macd"

# ─── Background cache cleanup ──────────────────────────────────
@app.on_event("startup")
async def startup():
    asyncio.create_task(periodic_cleanup())

async def periodic_cleanup():
    while True:
        await asyncio.sleep(3600)  # cleanup every hour
        cache.cleanup()

# ─── Routes ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    # --- Validate input ---
    if request.region_type not in ("kline", "macd"):
        raise HTTPException(status_code=400, detail="region_type must be 'kline' or 'macd'")

    if not request.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    # --- Cache check ---
    image_hash = hashlib.md5(request.image_base64.encode()).hexdigest()
    cache_key = f"{image_hash}_{request.region_type}"

    cached = cache.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    # --- Build prompt ---
    if request.region_type == "kline":
        prompt = (
            "分析这张K线图区域。请只输出JSON格式，不要任何其他文字。"
            "JSON包含字段：kline_pattern（字符串，例如'阳线'/'阴线'/'十字星'/'锤子线'/'倒锤子'/'吞没形态'），"
            "confidence（0到1的浮点数，表示判断置信度）。"
        )
    else:
        prompt = (
            "分析这张MACD指标图区域。请只输出JSON格式，不要任何其他文字。"
            "JSON包含字段：macd_signal（字符串，例如'金叉'/'死叉'/'无'），"
            "confidence（0到1的浮点数，表示判断置信度）。"
        )

    # --- Call DeepSeek API ---
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY environment variable not set")

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{request.image_base64}"
                                    },
                                },
                                {"type": "text", "text": prompt},
                            ],
                        }
                    ],
                    "max_tokens": 256,
                    "temperature": 0.1,
                },
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"DeepSeek API error: {response.status_code} - {response.text[:500]}",
                )

            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()

            # --- Parse JSON from response ---
            try:
                # Remove markdown code fences if present
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                parsed = json.loads(content)
            except json.JSONDecodeError:
                parsed = {
                    "error": "Failed to parse API response as JSON",
                    "raw_response": content[:500],
                }

            # --- Cache and return ---
            cache.set(cache_key, parsed)
            return {**parsed, "cached": False}

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="DeepSeek API timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ─── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
