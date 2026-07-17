from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.mongodb_uri, tlsAllowInvalidCertificates=True)
try:
    db = client.get_default_database()
    if db is None:
        db = client.get_database("connectilearn")
except Exception:
    db = client.get_database("connectilearn")

# Database collections matching Mongoose names
users_collection = db["users"]
documents_collection = db["documents"]
chats_collection = db["chats"]
leaderboard_collection = db["styleleaderboards"]
behavior_collection = db["behaviormetrics"]

async def init_db():
    # Ensure indexes
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("role")
    await documents_collection.create_index([("userId", 1), ("createdAt", -1)])
    await chats_collection.create_index([("userId", 1), ("isPinned", -1), ("updatedAt", -1)])
    await behavior_collection.create_index([("userId", 1), ("sessionId", 1), ("pagePath", 1)], unique=True)
    await behavior_collection.create_index([("userId", 1), ("pagePath", 1)])
