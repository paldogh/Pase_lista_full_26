import json
import numpy as np
from deepface import DeepFace
from fastapi import HTTPException
from .config import settings

def create_embedding(image) -> np.ndarray:
    try:
        faces = DeepFace.represent(
            img_path=image,
            model_name=settings.facial_model_name,
            detector_backend=settings.facial_detector_backend,
            enforce_detection=True,
            align=True,
        )
    except Exception as exc:
        # Do not expose internal stack traces or image content.
        msg = str(exc).lower()
        if "face" in msg or "detect" in msg:
            raise HTTPException(status_code=422, detail="No se detectó un rostro. Centra el rostro y mejora la iluminación.")
        raise HTTPException(status_code=503, detail="El motor facial no pudo procesar la imagen")
    if len(faces) != 1:
        raise HTTPException(status_code=422, detail="Debe aparecer exactamente una persona en la imagen")
    embedding = np.asarray(faces[0]["embedding"], dtype=np.float32)
    if embedding.ndim != 1 or not np.isfinite(embedding).all():
        raise HTTPException(status_code=422, detail="No se pudo generar una plantilla facial válida")
    norm = np.linalg.norm(embedding)
    if norm == 0:
        raise HTTPException(status_code=422, detail="Plantilla facial inválida")
    return embedding / norm

def serialize_embedding(embedding: np.ndarray) -> bytes:
    return embedding.astype(np.float32).tobytes()

def deserialize_embedding(raw: bytes) -> np.ndarray:
    return np.frombuffer(raw, dtype=np.float32)

def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 1.0
    return float(1.0 - np.dot(a, b) / denom)
