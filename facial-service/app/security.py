import hmac
from fastapi import Header, HTTPException
from cryptography.fernet import Fernet, InvalidToken
from .config import settings

_cipher = Fernet(settings.facial_encryption_key.encode())

def require_api_key(x_api_key: str | None = Header(default=None)):
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.facial_api_key):
        raise HTTPException(status_code=401, detail="API key inválida")

def encrypt_embedding(raw: bytes) -> bytes:
    return _cipher.encrypt(raw)

def decrypt_embedding(encrypted: bytes) -> bytes:
    try:
        return _cipher.decrypt(encrypted)
    except InvalidToken:
        raise RuntimeError("No se pudo descifrar una plantilla; revisa FACIAL_ENCRYPTION_KEY")
