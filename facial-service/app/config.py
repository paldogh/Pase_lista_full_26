from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    facial_api_key: str
    facial_encryption_key: str
    facial_max_distance: float = 0.30
    facial_max_image_bytes: int = 5 * 1024 * 1024
    facial_model_name: str = "Facenet512"
    facial_detector_backend: str = "opencv"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

settings = Settings()
