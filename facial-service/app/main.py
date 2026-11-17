from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .config import settings
from .database import Base, engine, get_db
from .models import FaceTemplate
from .schemas import EnrollRequest, EnrollResponse, RecognizeRequest, RecognizeResponse
from .security import require_api_key, encrypt_embedding, decrypt_embedding
from .images import decode_image
from .face_engine import create_embedding, serialize_embedding, deserialize_embedding, cosine_distance

app = FastAPI(
    title="PaseLista Facial Service",
    version="0.1.0",
    description="Servicio interno de plantillas y comparación facial. No registra asistencias."
)

@app.on_event("startup")
def startup():
    # For the first MVP. In production, manage this table with migrations.
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"ok": True, "service": "pase-lista-facial", "model": settings.facial_model_name}

@app.post("/v1/faces/enroll", response_model=EnrollResponse, dependencies=[Depends(require_api_key)])
def enroll(body: EnrollRequest, db: Session = Depends(get_db)):
    image = decode_image(body.image_base64)
    embedding = create_embedding(image)
    encrypted = encrypt_embedding(serialize_embedding(embedding))
    record = db.get(FaceTemplate, body.alumno_id)
    if record:
        record.embedding_encrypted = encrypted
        record.model_name = settings.facial_model_name
    else:
        record = FaceTemplate(
            alumno_id=body.alumno_id,
            embedding_encrypted=encrypted,
            model_name=settings.facial_model_name,
        )
        db.add(record)
    db.commit()
    return EnrollResponse(enrolled=True, alumno_id=body.alumno_id, model=settings.facial_model_name)

@app.post("/v1/faces/recognize", response_model=RecognizeResponse, dependencies=[Depends(require_api_key)])
def recognize(body: RecognizeRequest, db: Session = Depends(get_db)):
    image = decode_image(body.image_base64)
    probe = create_embedding(image)
    records = db.scalars(select(FaceTemplate).where(FaceTemplate.model_name == settings.facial_model_name)).all()
    if not records:
        return RecognizeResponse(matched=False, alumno_id=None, distance=None, model=settings.facial_model_name)

    best_id, best_distance = None, 2.0
    for record in records:
        candidate = deserialize_embedding(decrypt_embedding(record.embedding_encrypted))
        if candidate.shape != probe.shape:
            continue
        distance = cosine_distance(probe, candidate)
        if distance < best_distance:
            best_id, best_distance = record.alumno_id, distance

    # This threshold is not a probability and must be validated for the school's environment.
    if best_id is not None and best_distance <= settings.facial_max_distance:
        return RecognizeResponse(
            matched=True,
            alumno_id=best_id,
            distance=round(best_distance, 5),
            model=settings.facial_model_name,
        )
    return RecognizeResponse(
        matched=False,
        alumno_id=None,
        distance=round(best_distance, 5) if best_id is not None else None,
        model=settings.facial_model_name,
    )

@app.delete("/v1/faces/{alumno_id}", dependencies=[Depends(require_api_key)])
def delete_face(alumno_id: str, db: Session = Depends(get_db)):
    record = db.get(FaceTemplate, alumno_id)
    if not record:
        return {"deleted": False, "alumno_id": alumno_id}
    db.delete(record)
    db.commit()
    return {"deleted": True, "alumno_id": alumno_id}
