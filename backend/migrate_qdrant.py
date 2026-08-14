from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from dotenv import load_dotenv
import os

load_dotenv()

COLLECTION_NAME = "sogno_knowledge_base"

# --------------------------------------------------
# LOCAL QDRANT
# --------------------------------------------------

local_client = QdrantClient(
    path="qdrant_storage"
)

# --------------------------------------------------
# QDRANT CLOUD
# --------------------------------------------------

cloud_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=120,
)

print("Reading local collection...")

local_collection = local_client.get_collection(
    COLLECTION_NAME
)

print(
    f"Local points: {local_collection.points_count}"
)


# --------------------------------------------------
# CREATE CLOUD COLLECTION
# --------------------------------------------------

if not cloud_client.collection_exists(
    COLLECTION_NAME
):

    print("Creating collection in Qdrant Cloud...")

    cloud_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=local_collection.config.params.vectors,
    )

else:

    print("Cloud collection already exists.")


# --------------------------------------------------
# READ LOCAL POINTS
# --------------------------------------------------

print("Reading local vectors...")

points, _ = local_client.scroll(
    collection_name=COLLECTION_NAME,
    limit=1000,
    with_vectors=True,
    with_payload=True,
)

print(
    f"Found {len(points)} points."
)


# --------------------------------------------------
# CONVERT TO POINT STRUCTS
# --------------------------------------------------

cloud_points = []

for point in points:

    cloud_points.append(
        PointStruct(
            id=point.id,
            vector=point.vector,
            payload=point.payload,
        )
    )


# --------------------------------------------------
# UPLOAD IN SMALL BATCHES
# --------------------------------------------------

BATCH_SIZE = 10

total = len(cloud_points)

print(
    f"Uploading {total} points in batches of {BATCH_SIZE}..."
)

for start in range(
    0,
    total,
    BATCH_SIZE
):

    batch = cloud_points[
        start:start + BATCH_SIZE
    ]

    end = start + len(batch)

    print(
        f"Uploading points {start + 1}-{end}..."
    )

    cloud_client.upsert(
        collection_name=COLLECTION_NAME,
        points=batch,
        wait=True,
    )

    print(
        f"Uploaded {end}/{total}"
    )


# --------------------------------------------------
# VERIFY
# --------------------------------------------------

cloud_collection = cloud_client.get_collection(
    COLLECTION_NAME
)

print()
print("================================")
print("MIGRATION COMPLETED")
print("================================")

print(
    f"Cloud points: {cloud_collection.points_count}"
)


local_client.close()
cloud_client.close()