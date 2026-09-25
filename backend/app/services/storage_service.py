import logging
import uuid
import os
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("storage")


class StorageService:
    def __init__(self):
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.client: Optional[Client] = None

        if (
            settings.SUPABASE_URL
            and not settings.SUPABASE_URL.startswith("https://placeholder")
            and settings.SUPABASE_SECRET_KEY
            and settings.SUPABASE_SECRET_KEY != "placeholder-secret-key"
        ):
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
            except Exception as e:
                logger.warning("Could not initialize live Supabase client: %s", str(e))

    def get_storage_path(self, user_id: uuid.UUID, document_id: uuid.UUID, filename: str) -> str:
        """
        Generates standard multi-tenant storage path:
        {user_id}/{document_id}/{filename}
        """
        return f"{user_id}/{document_id}/{filename}"

    def upload_file(
        self,
        storage_path: str,
        file_bytes: bytes,
        content_type: str,
    ) -> bool:
        """
        Uploads file to Supabase private storage bucket.
        """
        if self.client:
            try:
                # Supabase storage upload
                self.client.storage.from_(self.bucket).upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "false"},
                )
                return True
            except Exception as e:
                logger.error("Failed to upload to Supabase Storage: %s", str(e))
                raise
        else:
            logger.info("[Mock Storage] Uploaded %d bytes to path %s", len(file_bytes), storage_path)
            return True

    def delete_file(self, storage_path: str) -> bool:
        """
        Deletes file from Supabase storage bucket.
        """
        if self.client:
            try:
                self.client.storage.from_(self.bucket).remove([storage_path])
                return True
            except Exception as e:
                logger.error("Failed to delete from Supabase Storage: %s", str(e))
                return False
        else:
            logger.info("[Mock Storage] Deleted path %s", storage_path)
            return True

    def create_signed_url(self, storage_path: str, expires_in: int = 60) -> Optional[str]:
        """
        Creates a time-limited signed download URL for private files.
        """
        if self.client:
            try:
                res = self.client.storage.from_(self.bucket).create_signed_url(storage_path, expires_in)
                if isinstance(res, dict) and "signedURL" in res:
                    return res["signedURL"]
                elif hasattr(res, "signed_url"):
                    return res.signed_url
                return None
            except Exception as e:
                logger.error("Failed to generate signed URL: %s", str(e))
                return None
        return f"https://mock-storage.local/{self.bucket}/{storage_path}?token=mock-signed-url"


storage_service = StorageService()
