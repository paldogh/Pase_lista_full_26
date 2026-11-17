from pydantic import BaseModel, Field

class EnrollRequest(BaseModel):
    alumno_id: str = Field(min_length=1, max_length=128)
    image_base64: str = Field(min_length=100)

class RecognizeRequest(BaseModel):
    image_base64: str = Field(min_length=100)

class EnrollResponse(BaseModel):
    enrolled: bool
    alumno_id: str
    model: str

class RecognizeResponse(BaseModel):
    matched: bool
    alumno_id: str | None
    distance: float | None
    model: str
