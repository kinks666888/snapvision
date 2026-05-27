import os
import sys
import json
import logging
import io

# 彻底禁用所有日志输出
os.environ['DISABLE_MODEL_LOG'] = '1'
os.environ['GLOG_minloglevel'] = '3'
logging.disable(logging.CRITICAL)

# ── 关键修复：PaddleOCR 把 DEBUG 日志写到 stdout ──
# 在初始化 PaddleOCR 和调用 OCR 期间，把 stdout 重定向到 stderr
# 这样只有我们手动 print 的 JSON 会出现在 stdout
old_stdout = sys.stdout
sys.stdout = sys.stderr  # PaddleOCR 日志 → stderr

from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_angle_cls=False,
    lang='ch',
    show_log=False,
    use_mp=False
)

if len(sys.argv) < 2:
    sys.stdout = old_stdout
    sys.stdout.write(json.dumps([], ensure_ascii=False))
    sys.exit(0)

image_path = sys.argv[1]
result = ocr.ocr(image_path, cls=False)

# ── 恢复 stdout，以下输出不受污染 ──
sys.stdout = old_stdout

texts = []
if result:
    for line in result[0]:
        if len(line) > 1:
            texts.append(line[1][0])

# 纯净 JSON 输出
sys.stdout.write(json.dumps(texts, ensure_ascii=False))