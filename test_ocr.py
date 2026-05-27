from paddleocr import PaddleOCR

ocr = PaddleOCR(use_textline_orientation=True, lang='ch')

result = ocr.predict('test.jpg')

print(result)