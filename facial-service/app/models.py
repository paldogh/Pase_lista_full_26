from sqlalchemy import String, LargeBinary, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class FaceTemplate(Base):
    __tablename__ = "face_templates"

    # Must be the exact Alumno.id from the Node/Prisma database.
    alumno_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    embedding_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
