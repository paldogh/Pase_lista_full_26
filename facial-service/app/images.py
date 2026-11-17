import base64
import binascii
import cv2
import numpy as np
from fastapi import HTTPException
from .config import settings

def decode_image(image_base64: str):
    # Accept raw base64 only; data URI prefix is removed if the client sends one.
    payload = image_base64.split(",", 1)[1] if image_base64.startswith("data:") and "," in image_base64 else image_base64
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="La imagen no contiene base64 válido")
    if len(raw) > settings.facial_max_image_bytes:
        raise HTTPException(status_code=413, detail="La imagen supera el tamaño permitido")
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")
    h, w = image.shape[:2]
    if w < 160 or h < 160:
        raise HTTPException(status_code=400, detail="La imagen es demasiado pequeña")
    return image
