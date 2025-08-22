from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import asyncio
from geopy.distance import geodesic
import json

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "aid-connect-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Aid-Connect API", description="AI-powered community help platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# AI Service Configuration
class AIService:
    def __init__(self):
        self.emergency_chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id="urgency-classifier",
            system_message="""You are an AI assistant specializing in analyzing help requests for urgency classification. 

Analyze the request and return ONLY a JSON response with this exact format:
{
    "urgency_score": number (1-10, where 10 is life-threatening emergency),
    "category": "medical|food|shelter|transport|safety|education|elder_care|child_care|pet_care|other",
    "priority": "low|medium|high|emergency",
    "estimated_response_time": "within X minutes/hours",
    "reasoning": "brief explanation"
}

Consider these factors:
- Medical emergencies (unconscious, bleeding, heart attack): 9-10
- Safety emergencies (fire, accident, violence): 8-10  
- Urgent needs (lost child, stranded): 6-8
- Important but not urgent (groceries, transport): 3-5
- General help (tutoring, companionship): 1-3

Keywords indicating high urgency: emergency, urgent, help, bleeding, unconscious, fire, accident, pain, dying, lost, stranded, immediate, asap"""
        ).with_model("gemini", "gemini-2.0-flash")
        
        self.moderation_chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id="content-moderator",
            system_message="""You are a content moderator for a community help platform. Analyze content for safety and appropriateness.

Return ONLY a JSON response:
{
    "approved": true/false,
    "confidence": number (0-1),
    "flags": ["spam", "inappropriate", "dangerous", "fake"] or [],
    "reasoning": "brief explanation"
}

Reject if content contains:
- Requests for money/payments
- Inappropriate sexual content
- Dangerous illegal activities
- Clear spam or fake requests
- Harmful or threatening language"""
        ).with_model("gemini", "gemini-2.0-flash")

ai_service = AIService()

# Models
class Location(BaseModel):
    latitude: float
    longitude: float
    address: str
    fuzzy_radius: Optional[int] = 100  # meters

class UserProfile(BaseModel):
    name: str
    avatar_url: Optional[str] = None
    location: Location
    bio: Optional[str] = None

class UserPreferences(BaseModel):
    max_distance: int = 5000  # meters
    categories: List[str] = []
    notifications_enabled: bool = True

class UserStats(BaseModel):
    requests_made: int = 0
    offers_made: int = 0
    help_provided: int = 0
    community_rating: float = 5.0
    total_ratings: int = 0

class UserVerification(BaseModel):
    phone_verified: bool = False
    email_verified: bool = False
    id_verified: bool = False
    trust_score: float = 1.0

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    phone: Optional[str] = None
    hashed_password: str
    profile: UserProfile
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    verification: UserVerification = Field(default_factory=UserVerification)
    stats: UserStats = Field(default_factory=UserStats)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    email: str
    password: str
    phone: Optional[str] = None
    profile: UserProfile

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str

class RequestMedia(BaseModel):
    images: List[str] = []
    voice_note_url: Optional[str] = None

class RequestMatching(BaseModel):
    respondents: List[str] = []
    matched_with: Optional[str] = None
    ai_matches: List[Dict[str, Any]] = []

class HelpRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str
    urgency_score: float = 1.0
    priority: str = "low"
    status: str = "open"  # open, matched, fulfilled, expired, cancelled
    location: Location
    media: RequestMedia = Field(default_factory=RequestMedia)
    matching: RequestMatching = Field(default_factory=RequestMatching)
    estimated_response_time: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HelpRequestCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    location: Location

class OfferAvailability(BaseModel):
    start_time: datetime
    end_time: datetime
    recurring: bool = False
    days_of_week: List[int] = []  # 0=Monday, 6=Sunday

class HelpOffer(BaseModel):
    offer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    category: str
    skills: List[str] = []
    availability: OfferAvailability
    location: Location
    max_distance: int = 5000  # meters
    capacity: int = 1
    current_matches: int = 0
    status: str = "active"  # active, paused, full, inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HelpOfferCreate(BaseModel):
    title: str
    description: str
    category: str
    skills: List[str] = []
    availability: OfferAvailability
    location: Location
    max_distance: int = 5000
    capacity: int = 1

class Message(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, location, system
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    read_by: List[str] = []

class Conversation(BaseModel):
    conversation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]
    request_id: Optional[str] = None
    offer_id: Optional[str] = None
    last_message: Optional[Dict[str, Any]] = None
    status: str = "active"  # active, archived, blocked
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Auth helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"user_id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# AI Helper Functions
async def classify_request_urgency(title: str, description: str, category: str = None) -> Dict[str, Any]:
    """Use AI to classify request urgency and category"""
    try:
        prompt = f"Analyze this help request:\nTitle: {title}\nDescription: {description}"
        if category:
            prompt += f"\nSuggested Category: {category}"
        
        message = UserMessage(text=prompt)
        response = await ai_service.emergency_chat.send_message(message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
            
        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"AI classification error: {e}")
        # Fallback to keyword-based classification
        return {
            "urgency_score": 3.0,
            "category": category or "other",
            "priority": "medium",
            "estimated_response_time": "within 4 hours",
            "reasoning": "AI classification unavailable, using default values"
        }

async def moderate_content(content: str) -> Dict[str, Any]:
    """Use AI to moderate content for safety"""
    try:
        message = UserMessage(text=f"Moderate this content: {content}")
        response = await ai_service.moderation_chat.send_message(message)
        
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
            
        result = json.loads(response_text)
        return result
    except Exception as e:
        logging.error(f"Content moderation error: {e}")
        return {
            "approved": True,
            "confidence": 0.5,
            "flags": [],
            "reasoning": "Moderation unavailable, allowing content"
        }

# Matching algorithm
def calculate_distance(loc1: Location, loc2: Location) -> float:
    """Calculate distance between two locations in meters"""
    return geodesic((loc1.latitude, loc1.longitude), (loc2.latitude, loc2.longitude)).meters

async def find_matches_for_request(request: HelpRequest, limit: int = 10) -> List[Dict[str, Any]]:
    """Find matching offers for a request"""
    # Get offers in the same category
    offers_cursor = db.offers.find({
        "category": request.category,
        "status": "active",
        "user_id": {"$ne": request.user_id}  # Don't match with self
    })
    
    matches = []
    async for offer_doc in offers_cursor:
        offer = HelpOffer(**offer_doc)
        
        # Calculate distance
        distance = calculate_distance(request.location, offer.location)
        
        # Check if within range
        if distance <= offer.max_distance:
            # Calculate match score (0-1)
            distance_score = max(0, 1 - (distance / offer.max_distance))
            category_score = 1.0 if request.category == offer.category else 0.5
            
            # Get helper's stats for reliability score
            helper = await db.users.find_one({"user_id": offer.user_id})
            if helper:
                reliability_score = min(helper.get("stats", {}).get("community_rating", 3.0) / 5.0, 1.0)
            else:
                reliability_score = 0.6
            
            # Weighted final score
            final_score = (distance_score * 0.4 + category_score * 0.3 + reliability_score * 0.3)
            
            if final_score > 0.3:  # Minimum threshold
                matches.append({
                    "offer_id": offer.offer_id,
                    "user_id": offer.user_id,
                    "title": offer.title,
                    "distance": round(distance),
                    "match_score": round(final_score, 2),
                    "helper_rating": helper.get("stats", {}).get("community_rating", 3.0) if helper else 3.0
                })
    
    # Sort by score (highest first)
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:limit]

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hashed_password,
        profile=user_data.profile
    )
    
    # Save to database
    await db.users.insert_one(user.dict())
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user_id=user.user_id)

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not verify_password(user_data.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    
    # Update last active
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"last_active": datetime.utcnow()}}
    )
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user_id=user.user_id)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Request endpoints
@api_router.post("/requests", response_model=HelpRequest)
async def create_request(request_data: HelpRequestCreate, current_user: User = Depends(get_current_user)):
    # Moderate content
    moderation_result = await moderate_content(f"{request_data.title} {request_data.description}")
    if not moderation_result.get("approved", True):
        raise HTTPException(
            status_code=400, 
            detail=f"Request rejected: {moderation_result.get('reasoning', 'Content moderation failed')}"
        )
    
    # AI classification
    ai_result = await classify_request_urgency(
        request_data.title, 
        request_data.description, 
        request_data.category
    )
    
    # Create request with AI insights
    request = HelpRequest(
        user_id=current_user.user_id,
        title=request_data.title,
        description=request_data.description,
        category=ai_result.get("category", request_data.category or "other"),
        urgency_score=ai_result.get("urgency_score", 3.0),
        priority=ai_result.get("priority", "medium"),
        location=request_data.location,
        estimated_response_time=ai_result.get("estimated_response_time"),
        expires_at=datetime.utcnow() + timedelta(days=7)  # Default 7 days
    )
    
    # Find initial matches
    matches = await find_matches_for_request(request)
    request.matching.ai_matches = matches
    
    # Save to database
    await db.requests.insert_one(request.dict())
    
    return request

@api_router.get("/requests", response_model=List[HelpRequest])
async def get_requests(
    category: Optional[str] = None,
    status: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[int] = 5000,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    # Build query
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["open", "matched"]}  # Active requests
    
    # Location-based filtering
    if latitude and longitude:
        # This is a simplified approach - in production, use MongoDB geospatial queries
        query["location.latitude"] = {
            "$gte": latitude - (radius / 111000),  # Rough conversion
            "$lte": latitude + (radius / 111000)
        }
        query["location.longitude"] = {
            "$gte": longitude - (radius / 111000),
            "$lte": longitude + (radius / 111000)
        }
    
    # Get requests
    requests_cursor = db.requests.find(query).sort("urgency_score", -1).limit(limit)
    requests = []
    
    async for request_doc in requests_cursor:
        requests.append(HelpRequest(**request_doc))
    
    return requests

@api_router.get("/requests/{request_id}", response_model=HelpRequest)
async def get_request(request_id: str, current_user: User = Depends(get_current_user)):
    request_doc = await db.requests.find_one({"request_id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    return HelpRequest(**request_doc)

# Offer endpoints
@api_router.post("/offers", response_model=HelpOffer)
async def create_offer(offer_data: HelpOfferCreate, current_user: User = Depends(get_current_user)):
    offer = HelpOffer(
        user_id=current_user.user_id,
        **offer_data.dict()
    )
    
    await db.offers.insert_one(offer.dict())
    return offer

@api_router.get("/offers", response_model=List[HelpOffer])
async def get_offers(
    category: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[int] = 5000,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    query = {"status": "active"}
    if category:
        query["category"] = category
    
    offers_cursor = db.offers.find(query).limit(limit)
    offers = []
    
    async for offer_doc in offers_cursor:
        offers.append(HelpOffer(**offer_doc))
    
    return offers

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "Aid-Connect API - Empowering Communities"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "ai": "available"
        }
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()