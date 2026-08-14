import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PayloadSchemaType

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

COLLECTION_NAME = "sogno_knowledge_base"

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

print("Creating payload index...")

client.create_payload_index(
    collection_name=COLLECTION_NAME,
    field_name="metadata.access_roles",
    field_schema=PayloadSchemaType.KEYWORD,
)

print("================================")
print("INDEX CREATED SUCCESSFULLY")
print("================================")