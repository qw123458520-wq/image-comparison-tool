#!/usr/bin/env python3
"""
人脸分析脚本 - 使用 OpenCV 进行人脸检测
完全本地处理，无网络请求
"""

import sys
import json
import time
from pathlib import Path
import os

try:
    import cv2
    import numpy as np
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "OpenCV not installed. Please run: pip install opencv-python",
        "error_code": "MISSING_DEPENDENCY"
    }))
    sys.exit(1)

# 年龄段定义（暂时使用默认值，因为 OpenCV 不支持年龄检测）
AGE_RANGES = {
    '0-18': (0, 18),
    '19-30': (19, 30),
    '31-45': (31, 45),
    '46-60': (46, 60),
    '60+': (60, 150)
}

def get_age_range(age: int) -> str:
    """根据年龄获取年龄段"""
    for range_name, (min_age, max_age) in AGE_RANGES.items():
        if min_age <= age <= max_age:
            return range_name
    return '未知'

def analyze_image(image_path: str):
    """分析单张图片 - 仅检测人脸数量"""
    start_time = time.time()

    try:
        # 读取图片
        image = cv2.imread(image_path)
        if image is None:
            return {
                "success": False,
                "image_path": str(image_path),
                "error": "Failed to read image",
                "error_code": "IMAGE_READ_ERROR"
            }

        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 获取 OpenCV 内置的人脸检测器（Haar Cascade）
        # 使用绝对路径加载 cascade 文件
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)

        # 检测人脸
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        face_count = len(faces)
        faces_list = []

        # 构建人脸信息列表（OpenCV 只能检测位置，不能检测性别和年龄）
        for i, (x, y, w, h) in enumerate(faces):
            faces_list.append({
                "face_id": i,
                "gender": "unknown",  # OpenCV 无法检测性别
                "gender_confidence": 0,
                "age_range": "未知",  # OpenCV 无法检测年龄
                "age_estimated": 0,
                "region": {
                    "x": int(x),
                    "y": int(y),
                    "w": int(w),
                    "h": int(h)
                }
            })

        processing_time = time.time() - start_time

        return {
            "success": True,
            "image_path": str(image_path),
            "face_count": face_count,
            "faces": faces_list,
            "processing_time": round(processing_time, 2)
        }

    except Exception as e:
        return {
            "success": False,
            "image_path": str(image_path),
            "error": str(e),
            "error_code": "PROCESSING_ERROR"
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python face_analyzer.py <image_path>",
            "error_code": "INVALID_ARGS"
        }))
        sys.exit(1)

    image_path = sys.argv[1]

    # 检查文件是否存在
    if not Path(image_path).exists():
        print(json.dumps({
            "success": False,
            "error": f"File not found: {image_path}",
            "error_code": "FILE_NOT_FOUND"
        }))
        sys.exit(1)

    # 执行分析
    result = analyze_image(image_path)

    # 输出 JSON 结果
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
