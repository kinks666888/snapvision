"""
SnapVision OCR 常驻服务
端口: 5002
启动时加载 PaddleOCR 模型一次，后续请求直接复用。
"""

import os
import sys
import json
import logging
import time
import traceback
import signal

# ── 环境配置 ──
os.environ['DISABLE_MODEL_LOG'] = '1'
os.environ['GLOG_minloglevel'] = '3'
logging.disable(logging.CRITICAL)

# 屏蔽 PaddleOCR DEBUG 日志
import warnings
warnings.filterwarnings('ignore')

from flask import Flask, request, jsonify

app = Flask(__name__)
ocr_engine = None
MODEL_LOADED = False
load_start = 0

# ── 全局错误处理器：所有错误一律返回 JSON ──
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed"}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500

@app.errorhandler(Exception)
def unhandled_error(e):
    return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """健康检查 — Node 启动时轮询此接口"""
    return jsonify({
        "status": "ok" if MODEL_LOADED else "loading",
        "model": "loaded" if MODEL_LOADED else "initializing",
    })


@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """OCR 识别端点"""
    global ocr_engine

    if ocr_engine is None:
        return jsonify({"success": False, "error": "Model not loaded yet"}), 503

    data = request.get_json(silent=True) or {}
    image_path = data.get('image_path', '')

    if not image_path or not os.path.exists(image_path):
        return jsonify({"success": False, "error": f"Image not found: {image_path}"}), 400

    t0 = time.time()
    old_stdout = sys.stdout  # 在 try 之前初始化，确保 except 中能访问
    try:
        # ── 关键修复：PaddleOCR 会将 DEBUG 日志写入 stdout ──
        # 导致通过管道读取 stdout 的 Node 进程收到非预期数据
        # 重定向 stdout → stderr，只保留我们手动返回的 JSON
        sys.stdout = sys.stderr

        result = ocr_engine.ocr(image_path, cls=False)

        # ── 恢复 stdout ──
        sys.stdout = old_stdout

        texts = []
        confidence = 0.0
        count = 0
        if result and len(result) > 0 and result[0]:
            for line in result[0]:
                if isinstance(line, (list, tuple)) and len(line) > 1:
                    text = line[1][0] if isinstance(line[1], (list, tuple)) else str(line[1])
                    texts.append(text)
                    confidence += line[1][1] if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 0.0
                    count += 1
        avg_conf = (confidence / count) if count > 0 else 0.0
        elapsed = time.time() - t0
        print(f"[OCR] 识别完成: {len(texts)} 条文本, 置信度 {avg_conf:.3f}, 耗时 {elapsed:.2f}s", flush=True)
        return jsonify({
            "success": True,
            "text": "\n".join(texts),
            "texts": texts,
            "confidence": round(avg_conf, 4),
            "elapsed_ms": int(elapsed * 1000),
        })
    except Exception as e:
        elapsed = time.time() - t0
        # 确保 stdout 已恢复，避免 JSON 响应写入被重定向的 stdout
        sys.stdout = old_stdout
        full_tb = traceback.format_exc()
        print(f"[OCR ERROR] {full_tb}", flush=True)
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": full_tb,
            "elapsed_ms": int(elapsed * 1000),
        }), 500


# ── 优雅退出 ──
def _shutdown(signum, frame):
    """SIGINT/SIGTERM 处理器：打印关闭信息后干净退出"""
    print("\n[OCR] Shutting down...", flush=True)
    # os._exit 立即退出，不抛异常，不触发 macOS 崩溃报告
    os._exit(0)


if __name__ == '__main__':
    port = int(os.environ.get('OCR_PORT', 5002))

    # 注册信号处理器（必须在主线程中注册）
    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    # ── 重定向 PaddleOCR debug 日志 ──
    print("[OCR] Loading PaddleOCR...", flush=True)
    load_start = time.time()

    from paddleocr import PaddleOCR
    ocr_engine = PaddleOCR(
        use_angle_cls=False,
        lang='ch',
        show_log=False,
        use_mp=False,
    )
    MODEL_LOADED = True
    elapsed = time.time() - load_start
    print(f"[OCR] Model Loaded ({elapsed:.1f}s)", flush=True)
    print(f"[OCR] Ready on port {port}", flush=True)

    try:
        app.run(host='127.0.0.1', port=port, debug=False)
    except KeyboardInterrupt:
        # Ctrl+C 直连终端时可能触发 KeyboardInterrupt
        print("\n[OCR] Shutting down...", flush=True)
        os._exit(0)
    except OSError as e:
        if 'Address already in use' in str(e):
            print(f"[OCR] Port {port} already in use — OCR server may already be running", flush=True)
        else:
            raise
