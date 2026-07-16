from datetime import datetime
from typing import Any, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, GetCoreSchemaHandler, field_validator
from pydantic_core import core_schema

# Custom type for handling MongoDB ObjectId in Pydantic v2
class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.str_schema(),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda val: str(val),
                return_schema=core_schema.str_schema(),
                when_used="always"
            )
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

# --- USER MODELS ---
class UserInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: str
    password: str
    role: str = "user"
    avatar: str = ""
    isActive: bool = True
    lastLogin: Optional[datetime] = None
    documentsCount: int = 0
    totalQueries: int = 0
    questionnaireCompleted: bool = False
    learningStyle: Optional[str] = None
    questionnaire: List[int] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("questionnaire")
    @classmethod
    def validate_questionnaire(cls, v):
        if len(v) != 0 and len(v) != 20:
            raise ValueError("Questionnaire must have exactly 20 answers")
        return v

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserResponse(BaseModel):
    id: str
    _id: str
    name: str
    email: str
    role: str
    questionnaireCompleted: bool
    learningStyle: Optional[str] = None
    questionnaire: List[int] = []
    createdAt: Optional[str] = None

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class QueryRequest(BaseModel):
    query: str


# --- DOCUMENT MODELS ---
class Chunk(BaseModel):
    text: str
    index: int
    wordCount: Optional[int] = None

class DocumentInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    filename: str
    originalName: str
    filepath: str
    content: str = ""
    chunks: List[Chunk] = Field(default_factory=list)
    userId: PyObjectId
    fileType: str
    size: int = 0
    wordCount: int = 0
    status: str = "processing"  # processing, ready, error
    errorMessage: Optional[str] = None
    isCompleted: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# --- CHAT MODELS ---
class ContextItem(BaseModel):
    text: str
    filename: str
    score: float

class Message(BaseModel):
    role: str  # user, assistant
    content: str
    contexts: List[ContextItem] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatInDB(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    userId: PyObjectId
    title: str = "New Chat"
    messages: List[Message] = Field(default_factory=list)
    isActive: bool = True
    isPinned: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# --- STYLE LEADERBOARD MODELS ---
class StyleLeaderboard(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    singletonId: str = "global"
    visualPoints: int = 0
    auditoryPoints: int = 0
    readwritePoints: int = 0
    kinestheticPoints: int = 0

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# --- BEHAVIOR METRIC MODELS ---
class BehaviorMetric(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    userId: PyObjectId
    sessionId: str
    pagePath: str
    totalTimeMs: int = 0
    tabSwitchCount: int = 0
    visitCount: int = 0
    lastReason: str = "heartbeat"
    lastUserAgent: str = ""
    firstSeenAt: datetime = Field(default_factory=datetime.utcnow)
    lastSeenAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
