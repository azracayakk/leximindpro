from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import emergentintegrations (optional)
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not available. AI features will be disabled.")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is required")
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db_name = os.environ.get('DB_NAME', 'leximind')
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="LexiMind Pro API")
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    role: str  # admin, teacher, student
    points: int = 0
    class_name: Optional[str] = None
    words_learned: int = 0
    games_played: int = 0
    streak: int = 0  # Günlük giriş serisi
    daily_words_target: int = 5  # Günlük kelime hedefi
    daily_words_progress: int = 0  # Bugün öğrenilen kelime sayısı
    last_daily_reset: Optional[str] = None  # Son sıfırlama tarihi
    last_login_date: Optional[str] = None  # Son giriş tarihi
    league_rank: Optional[int] = None  # Mevcut lig sıralaması
    xp: int = 0  # Experience points
    level: int = 1  # User level based on XP
    profile_star: bool = False  # Profile star badge (season winner)
    season_history: List[dict] = []  # Previous season results
    word_errors: dict = {}  # {category: error_count} for personalized learning
    pronunciation_scores: dict = {}  # {word_id: [scores]} for pronunciation tracking
    last_activity: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    class_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    points: int
    class_name: Optional[str] = None
    words_learned: int = 0
    games_played: int = 0

class ExampleSentence(BaseModel):
    sentence: str
    turkish: str

class Word(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    english: str
    turkish: str
    difficulty: int = 1
    category: str = "general"  # A1, A2, B1, B2, C1, general
    example_sentences: List[ExampleSentence] = []
    image_url: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WordCreate(BaseModel):
    english: str
    turkish: str
    difficulty: int = 1
    category: str = "general"
    example_sentences: List[ExampleSentence] = []

class BulkWordsUpload(BaseModel):
    words: List[dict]
    auto_generate_examples: bool = False

class GenerateExamplesRequest(BaseModel):
    word: str
    turkish: str
    level: str = "beginner"
    count: int = 3

class GameScore(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    game_type: str  # flashcard, matching, speed, sentence, story
    score: int
    correct_answers: int = 0
    wrong_answers: int = 0
    completed: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameScoreCreate(BaseModel):
    game_type: str
    score: int
    correct_answers: int = 0
    wrong_answers: int = 0
    completed: bool = True

class Achievement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon: str
    requirement: int
    requirement_type: str  # words_learned, games_played, score, streak
    rarity: str = "common"  # common, rare, epic, legendary

class League(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_number: int
    year: int
    start_date: str
    end_date: str
    standings: List[dict] = []  # [{user_id, username, points, rank}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Season(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    season_number: int  # Season number (1, 2, 3...)
    year: int
    start_date: str
    end_date: str  # 4 weeks later
    weeks: List[str] = []  # List of league IDs for this season
    final_standings: List[dict] = []  # [{user_id, username, total_points, rank, badges}]
    status: str = "active"  # active, completed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PersonalizedLearningPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    weak_categories: List[str] = []  # Categories with most errors
    study_words: List[str] = []  # Word IDs to study today
    study_count: int = 12  # Number of words to study
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PronunciationTest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    word_id: str
    score: int  # 0-100
    audio_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WordMatchGame(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    word_pairs: List[dict] = []  # [{word_id, match_type: "meaning"/"image"/"sentence"}]
    score: int = 0
    time_taken: int = 0  # seconds
    completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StoryProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    story_id: str
    words_learned_count: int  # Unlocked at 50, 100, 150...
    story_content: str
    highlighted_words: List[str] = []  # Word IDs used in story
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TeacherReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    student_id: str
    week_start: str
    week_end: str
    words_learned: int = 0
    errors_by_category: dict = {}
    last_login: Optional[str] = None
    level: int = 1
    pdf_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserAchievement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    achievement_id: str
    earned_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StoryRequest(BaseModel):
    difficulty: str = "beginner"
    topic: Optional[str] = None

class QuestionRequest(BaseModel):
    word_ids: List[str]
    question_type: str = "multiple_choice"  # multiple_choice, sentence_fill

class PronunciationTestRequest(BaseModel):
    word_id: str
    audio_data: Optional[str] = None  # Base64 audio or URL

class WordMatchGameCreate(BaseModel):
    match_type: str = "meaning"  # meaning, image, sentence
    difficulty: str = "medium"  # easy, medium, hard

class StoryProgressRequest(BaseModel):
    words_learned_count: int  # To unlock story at milestones

class TextToWordsRequest(BaseModel):
    text: str  # Teacher's text input
    auto_create: bool = True  # Auto-create words from text

# ============= HELPER FUNCTIONS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user WITHOUT password field for security"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Exclude password and _id for security
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_with_password(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user WITH password field - USE ONLY for password verification"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*allowed_roles: str):
    """Dependency factory for role-based authorization"""
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user
    return role_checker

# ============= INITIALIZE DEFAULT DATA =============

async def initialize_data():
    # Check if admin exists
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin_user = User(
            username="admin",
            password=hash_password(admin_password),
            role="admin"
        )
        await db.users.insert_one(admin_user.model_dump())
        logger.info("Admin user created")
    
    # Check if demo student exists
    demo_student = await db.users.find_one({"username": "demo_student"})
    if not demo_student:
        student_user = User(
            username="demo_student",
            password=hash_password("student123"),
            role="student"
        )
        await db.users.insert_one(student_user.model_dump())
        logger.info("Demo student user created")
    
    # Check if demo teacher exists
    demo_teacher = await db.users.find_one({"username": "demo_teacher"})
    if not demo_teacher:
        teacher_user = User(
            username="demo_teacher",
            password=hash_password("teacher123"),
            role="teacher"
        )
        await db.users.insert_one(teacher_user.model_dump())
        logger.info("Demo teacher user created")
    
    # Check if sample words exist
    word_count = await db.words.count_documents({})
    if word_count == 0:
        sample_words = [
            {"english": "apple", "turkish": "elma", "difficulty": 1, "category": "food"},
            {"english": "book", "turkish": "kitap", "difficulty": 1, "category": "education"},
            {"english": "cat", "turkish": "kedi", "difficulty": 1, "category": "animals"},
            {"english": "dog", "turkish": "köpek", "difficulty": 1, "category": "animals"},
            {"english": "house", "turkish": "ev", "difficulty": 1, "category": "places"},
            {"english": "beautiful", "turkish": "güzel", "difficulty": 2, "category": "adjectives"},
            {"english": "important", "turkish": "önemli", "difficulty": 2, "category": "adjectives"},
            {"english": "understand", "turkish": "anlamak", "difficulty": 3, "category": "verbs"},
        ]
        for word_data in sample_words:
            word = Word(
                english=word_data["english"],
                turkish=word_data["turkish"],
                difficulty=word_data["difficulty"],
                category=word_data["category"],
                created_by="system"
            )
            await db.words.insert_one(word.model_dump())
        logger.info(f"{len(sample_words)} sample words created")
    
    # Check if achievements exist
    achievement_count = await db.achievements.count_documents({})
    if achievement_count == 0:
        sample_achievements = [
            # Common
            {"name": "İlk Adım", "description": "İlk kelimeyi öğren", "icon": "🌟", "requirement": 1, "requirement_type": "words_learned", "rarity": "common"},
            {"name": "Kelime Avcısı", "description": "10 kelime öğren", "icon": "🎯", "requirement": 10, "requirement_type": "words_learned", "rarity": "common"},
            {"name": "Oyun Ustası", "description": "5 oyun oyna", "icon": "🎮", "requirement": 5, "requirement_type": "games_played", "rarity": "common"},
            # Rare
            {"name": "Yüksek Performans", "description": "500 puan kazan", "icon": "⚡", "requirement": 500, "requirement_type": "score", "rarity": "rare"},
            {"name": "Kelime Dehası", "description": "50 kelime öğren", "icon": "🧠", "requirement": 50, "requirement_type": "words_learned", "rarity": "rare"},
            {"name": "Kararlı Öğrenci", "description": "7 gün üst üste giriş yap", "icon": "🔥", "requirement": 7, "requirement_type": "streak", "rarity": "rare"},
            # Epic
            {"name": "Kelime Koleksiyoncusu", "description": "100 kelime öğren", "icon": "📚", "requirement": 100, "requirement_type": "words_learned", "rarity": "epic"},
            {"name": "Süper Oyuncu", "description": "1000 puan kazan", "icon": "🏆", "requirement": 1000, "requirement_type": "score", "rarity": "epic"},
            # Legendary
            {"name": "Kelime Efendisi", "description": "200 kelime öğren", "icon": "👑", "requirement": 200, "requirement_type": "words_learned", "rarity": "legendary"},
            {"name": "Lig Şampiyonu", "description": "Haftalık ligde 1. ol", "icon": "🥇", "requirement": 1, "requirement_type": "league_rank", "rarity": "legendary"},
        ]
        for achievement_data in sample_achievements:
            achievement = Achievement(**achievement_data)
            await db.achievements.insert_one(achievement.model_dump())
        logger.info(f"{len(sample_achievements)} achievements created")

# ============= AUTH ROUTES =============

@api_router.post("/auth/login")
async def login(user_login: UserLogin):
    user = await db.users.find_one({"username": user_login.username}, {"_id": 0})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Streak calculation
    now = datetime.now(timezone.utc)
    today = now.date()
    last_login_date = user.get("last_login_date")
    
    new_streak = 1
    if last_login_date:
        try:
            last_date = datetime.fromisoformat(last_login_date.replace('Z', '+00:00')).date()
            yesterday = (today - timedelta(days=1))
            
            if last_date == yesterday:
                # Consecutive day - increment streak
                new_streak = user.get("streak", 0) + 1
            elif last_date == today:
                # Same day - keep current streak
                new_streak = user.get("streak", 1)
            # else: first day or break - streak = 1 (already set)
        except:
            pass
    
    # Daily reset check
    last_reset = user.get("last_daily_reset")
    daily_progress = user.get("daily_words_progress", 0)
    
    if last_reset:
        try:
            reset_date = datetime.fromisoformat(last_reset.replace('Z', '+00:00')).date()
            if reset_date < today:
                daily_progress = 0
        except:
            pass
    
    # Update user with streak, login date, and activity
    update_data = {
        "last_activity": now.isoformat(),
        "last_login_date": today.isoformat(),
        "streak": new_streak,
        "daily_words_progress": daily_progress
    }
    
    if not last_reset or (last_reset and datetime.fromisoformat(last_reset.replace('Z', '+00:00')).date() < today):
        update_data["last_daily_reset"] = today.isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    # Update user dict for response
    user.update(update_data)
    
    access_token = create_access_token({"user_id": user["id"], "username": user["username"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "points": user.get("points", 0),
            "class_name": user.get("class_name"),
            "words_learned": user.get("words_learned", 0),
            "games_played": user.get("games_played", 0),
            "streak": new_streak,
            "daily_words_target": user.get("daily_words_target", 5),
            "daily_words_progress": daily_progress,
            "league_rank": user.get("league_rank")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "role": current_user["role"],
        "points": current_user.get("points", 0),
        "class_name": current_user.get("class_name"),
        "words_learned": current_user.get("words_learned", 0),
        "games_played": current_user.get("games_played", 0),
        "streak": current_user.get("streak", 0),
        "daily_words_target": current_user.get("daily_words_target", 5),
        "daily_words_progress": current_user.get("daily_words_progress", 0),
        "league_rank": current_user.get("league_rank")
    }

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user_with_password)  # Need password for verification
):
    # Verify old password
    if not verify_password(password_data.old_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Eski şifre hatalı")
    
    # Check new password length
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 6 karakter olmalıdır")
    
    # Update password
    new_hashed_password = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "Şifre başarıyla değiştirildi"}

# ============= USER MANAGEMENT (Admin Only) =============

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_create: UserCreate, current_user: dict = Depends(require_role("admin"))):
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_create.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_create.username,
        password=hash_password(user_create.password),
        role=user_create.role,
        class_name=user_create.class_name
    )
    await db.users.insert_one(user.model_dump())
    
    return UserResponse(**user.model_dump())

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role("admin", "teacher"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role("admin"))):
    
    # Don't allow deleting admin
    user = await db.users.find_one({"id": user_id})
    if user and user["username"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# ============= WORD MANAGEMENT =============

@api_router.post("/words", response_model=Word)
async def create_word(word_create: WordCreate, current_user: dict = Depends(require_role("admin", "teacher"))):
    
    word = Word(
        english=word_create.english,
        turkish=word_create.turkish,
        difficulty=word_create.difficulty,
        category=word_create.category,
        created_by=current_user["username"]
    )
    await db.words.insert_one(word.model_dump())
    return word

@api_router.get("/words", response_model=List[Word])
async def get_words(current_user: dict = Depends(get_current_user)):
    words = await db.words.find({}, {"_id": 0}).to_list(1000)
    return [Word(**word) for word in words]

@api_router.delete("/words/{word_id}")
async def delete_word(word_id: str, current_user: dict = Depends(require_role("admin", "teacher"))):
    
    result = await db.words.delete_one({"id": word_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Word not found")
    
    return {"message": "Word deleted successfully"}

# ============= GAME SCORES =============

# Old endpoint replaced by create_game_score_with_xp below

@api_router.get("/games/scores", response_model=List[GameScore])
async def get_game_scores(current_user: dict = Depends(get_current_user)):
    scores = await db.game_scores.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [GameScore(**score) for score in scores]

# ============= LEADERBOARD =============

@api_router.get("/leaderboard")
async def get_leaderboard(period: str = "all", current_user: dict = Depends(get_current_user)):
    # For now, just return all users sorted by points
    users = await db.users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    ).sort("points", -1).to_list(100)
    
    return [{"username": u["username"], "points": u.get("points", 0), "words_learned": u.get("words_learned", 0)} for u in users]

# ============= ACHIEVEMENTS =============

@api_router.get("/achievements", response_model=List[Achievement])
async def get_achievements():
    achievements = await db.achievements.find({}, {"_id": 0}).to_list(100)
    return [Achievement(**a) for a in achievements]

@api_router.get("/achievements/user")
async def get_user_achievements(current_user: dict = Depends(get_current_user)):
    user_achievements = await db.user_achievements.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return user_achievements

async def check_achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    achievements = await db.achievements.find({}, {"_id": 0}).to_list(100)
    
    for achievement in achievements:
        # Check if already earned
        existing = await db.user_achievements.find_one({
            "user_id": user_id,
            "achievement_id": achievement["id"]
        })
        if existing:
            continue
        
        # Check requirement
        earned = False
        if achievement["requirement_type"] == "words_learned":
            earned = user.get("words_learned", 0) >= achievement["requirement"]
        elif achievement["requirement_type"] == "games_played":
            earned = user.get("games_played", 0) >= achievement["requirement"]
        elif achievement["requirement_type"] == "score":
            earned = user.get("points", 0) >= achievement["requirement"]
        elif achievement["requirement_type"] == "streak":
            earned = user.get("streak", 0) >= achievement["requirement"]
        elif achievement["requirement_type"] == "league_rank":
            earned = user.get("league_rank") == achievement["requirement"]
        
        if earned:
            user_achievement = UserAchievement(
                user_id=user_id,
                achievement_id=achievement["id"]
            )
            await db.user_achievements.insert_one(user_achievement.model_dump())

# ============= AI STORY GENERATION =============

@api_router.post("/ai/generate-story")
async def generate_story(story_request: StoryRequest, current_user: dict = Depends(get_current_user)):
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI features are not available. emergentintegrations package is not installed.")
    
    try:
        # Get some words to include in the story
        words = await db.words.find({}, {"_id": 0}).to_list(20)
        word_list = [f"{w['english']} ({w['turkish']})" for w in random.sample(words, min(5, len(words)))]
        
        topic = story_request.topic or "a day at school"
        system_message = f"You are an English teacher. Create a short story (3-4 sentences) for {story_request.difficulty} level students about {topic}. Include these words: {', '.join(word_list)}. Make it educational and fun."
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"story_{current_user['id']}_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4-turbo")
        
        user_message = UserMessage(text=f"Create a story about {topic}")
        response = await chat.send_message(user_message)
        
        return {
            "story": response,
            "topic": topic,
            "difficulty": story_request.difficulty,
            "words_used": word_list
        }
    except Exception as e:
        logger.error(f"Story generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate story: {str(e)}")

# ============= AI EXAMPLE SENTENCE GENERATION =============

@api_router.post("/ai/generate-examples")
async def generate_examples(request: GenerateExamplesRequest, current_user: dict = Depends(get_current_user)):
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI features are not available. emergentintegrations package is not installed.")
    
    try:
        system_message = f"""You are an English teacher. Create {request.count} simple example sentences for language learners.
        
Rules:
- Use the word "{request.word}" in each sentence
- Level: {request.level}
- Keep sentences short and clear (max 12 words)
- Use simple grammar
- Return ONLY valid JSON array format

Format: [{{"sentence": "English sentence.", "turkish": "Türkçe çeviri."}}]"""
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"examples_{current_user['id']}_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4-turbo")
        
        user_message = UserMessage(text=f"Create {request.count} example sentences using the word '{request.word}' ({request.turkish})")
        response = await chat.send_message(user_message)
        
        # Parse JSON response with improved extraction
        try:
            response_text = str(response)
            
            # Use regex to find JSON array pattern
            json_match = re.search(r'\[[\s\S]*?\]', response_text)
            if json_match:
                json_text = json_match.group(0)
                examples = json.loads(json_text)
                
                # Validate structure
                if isinstance(examples, list) and all(
                    isinstance(ex, dict) and "sentence" in ex and "turkish" in ex
                    for ex in examples
                ):
                    return {"examples": examples}
            
            # Fallback: try direct JSON parse
            examples = json.loads(response_text)
            if isinstance(examples, list):
                return {"examples": examples}
        except Exception as e:
            logger.warning(f"JSON parsing failed, using fallback: {e}")
        
        # Final fallback: manual examples
        return {"examples": [
            {"sentence": f"I use {request.word} every day.", "turkish": f"Her gün {request.turkish} kullanırım."},
            {"sentence": f"This {request.word} is good.", "turkish": f"Bu {request.turkish} iyidir."},
            {"sentence": f"She likes {request.word}.", "turkish": f"O {request.turkish} seviyor."}
        ]}
    except Exception as e:
        logger.error(f"Example generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate examples: {str(e)}")

# ============= BULK WORD UPLOAD =============

@api_router.post("/words/bulk-upload")
async def bulk_upload_words(upload: BulkWordsUpload, current_user: dict = Depends(require_role("admin", "teacher"))):
    
    try:
        created_count = 0
        for word_data in upload.words:
            # Check if word already exists
            existing = await db.words.find_one({"english": word_data.get("english")})
            if existing:
                continue
            
            examples = []
            if upload.auto_generate_examples and word_data.get("english") and word_data.get("turkish"):
                # Generate examples with GPT-4
                try:
                    request = GenerateExamplesRequest(
                        word=word_data["english"],
                        turkish=word_data["turkish"],
                        level=word_data.get("category", "beginner"),
                        count=2
                    )
                    result = await generate_examples(request, current_user)
                    examples = [ExampleSentence(**ex) for ex in result.get("examples", [])]
                except:
                    pass
            
            word = Word(
                english=word_data.get("english", ""),
                turkish=word_data.get("turkish", ""),
                difficulty=word_data.get("difficulty", 1),
                category=word_data.get("category", "general"),
                example_sentences=examples,
                created_by=current_user["username"]
            )
            await db.words.insert_one(word.model_dump())
            created_count += 1
        
        return {"message": f"{created_count} words uploaded successfully", "count": created_count}
    except Exception as e:
        logger.error(f"Bulk upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")

# ============= AI QUESTION GENERATION =============

@api_router.post("/ai/generate-questions")
async def generate_questions(question_request: QuestionRequest, current_user: dict = Depends(get_current_user)):
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI features are not available. emergentintegrations package is not installed.")
    
    try:
        # Get words
        words = []
        for word_id in question_request.word_ids:
            word = await db.words.find_one({"id": word_id}, {"_id": 0})
            if word:
                words.append(word)
        
        if not words:
            raise HTTPException(status_code=400, detail="No valid words found")
        
        word_list = [f"{w['english']} = {w['turkish']}" for w in words]
        
        system_message = "You are an English teacher. Generate 3 multiple choice questions using the provided words. Return ONLY a JSON array of questions."
        prompt = f"Create 3 multiple choice questions using these words: {', '.join(word_list)}. Format: [{{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct\": 0}}]"
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"questions_{current_user['id']}_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4-turbo")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            response_text = str(response)
            json_match = re.search(r'\[[\s\S]*?\]', response_text)
            if json_match:
                questions = json.loads(json_match.group(0))
                if isinstance(questions, list):
                    return {"questions": questions, "words_used": word_list}
        except Exception as e:
            logger.warning(f"Question JSON parsing failed: {e}")
        
        return {"questions": response, "words_used": word_list}
    except Exception as e:
        logger.error(f"Question generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

# ============= LEAGUE SYSTEM =============

async def update_league_rankings():
    """Update all users' league_rank field based on current standings"""
    now = datetime.now(timezone.utc)
    week_number = now.isocalendar()[1]
    year = now.year
    
    # Get current league or create it
    league = await db.leagues.find_one({"week_number": week_number, "year": year})
    
    if league:
        # Update user league_rank from standings
        for standing in league.get("standings", []):
            await db.users.update_one(
                {"id": standing["user_id"]},
                {"$set": {"league_rank": standing.get("rank")}}
            )

@api_router.get("/league/current")
async def get_current_league(current_user: dict = Depends(get_current_user)):
    # Get or create current week's league
    now = datetime.now(timezone.utc)
    week_number = now.isocalendar()[1]
    year = now.year
    
    league = await db.leagues.find_one({"week_number": week_number, "year": year}, {"_id": 0})
    
    if not league:
        # Create new league for this week
        start_of_week = now - timedelta(days=now.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        # Get all student points
        students = await db.users.find({"role": "student"}, {"_id": 0, "password": 0}).to_list(1000)
        standings = sorted(
            [{"user_id": s["id"], "username": s["username"], "points": s.get("points", 0)} for s in students],
            key=lambda x: x["points"],
            reverse=True
        )
        
        # Add ranks
        for idx, standing in enumerate(standings):
            standing["rank"] = idx + 1
            # Update user's league_rank
            await db.users.update_one(
                {"id": standing["user_id"]},
                {"$set": {"league_rank": idx + 1}}
            )
        
        league = League(
            week_number=week_number,
            year=year,
            start_date=start_of_week.isoformat(),
            end_date=end_of_week.isoformat(),
            standings=standings
        )
        await db.leagues.insert_one(league.model_dump())
    else:
        # Update league rankings in user records
        await update_league_rankings()
    
    return league

@api_router.post("/league/update")
async def update_league_standings():
    """Update league standings - can be called by cron job or manually"""
    now = datetime.now(timezone.utc)
    week_number = now.isocalendar()[1]
    year = now.year
    
    students = await db.users.find({"role": "student"}, {"_id": 0, "password": 0}).to_list(1000)
    standings = sorted(
        [{"user_id": s["id"], "username": s["username"], "points": s.get("points", 0)} for s in students],
        key=lambda x: x["points"],
        reverse=True
    )
    
    for idx, standing in enumerate(standings):
        standing["rank"] = idx + 1
        # Update user's league_rank
        await db.users.update_one(
            {"id": standing["user_id"]},
            {"$set": {"league_rank": idx + 1}}
        )
    
    await db.leagues.update_one(
        {"week_number": week_number, "year": year},
        {"$set": {"standings": standings}},
        upsert=True
    )
    
    return {"message": "League updated"}

async def check_weekly_reset():
    """Check if we need to reset weekly league - called on startup"""
    now = datetime.now(timezone.utc)
    week_number = now.isocalendar()[1]
    year = now.year
    
    # Check if league exists for this week
    league = await db.leagues.find_one({"week_number": week_number, "year": year})
    
    if not league:
        # Auto-create new league for this week
        await update_league_standings()
        logger.info(f"New league created for week {week_number}, year {year}")

def calculate_xp_from_level(xp: int) -> int:
    """Calculate level from XP (100 XP per level)"""
    return (xp // 100) + 1

def calculate_level_xp_required(level: int) -> int:
    """Calculate XP required for a level"""
    return (level - 1) * 100

# ============= SEASON SYSTEM (4 WEEKS) =============

async def get_current_season():
    """Get or create current season"""
    now = datetime.now(timezone.utc)
    
    # Find active season
    active_season = await db.seasons.find_one({"status": "active"}, {"_id": 0})
    
    if active_season:
        # Check if season has ended (4 weeks passed)
        end_date = datetime.fromisoformat(active_season["end_date"].replace('Z', '+00:00'))
        if now > end_date:
            # Season ended - finalize it
            await finalize_season(active_season["id"])
            # Create new season
            return await create_new_season()
        return active_season
    
    # No active season - create new one
    return await create_new_season()

async def create_new_season():
    """Create a new 4-week season"""
    now = datetime.now(timezone.utc)
    
    # Get last season number
    last_season = await db.seasons.find_one(sort=[("season_number", -1)])
    season_number = 1 if not last_season else last_season["season_number"] + 1
    
    start_date = now
    end_date = now + timedelta(weeks=4)
    
    season = Season(
        season_number=season_number,
        year=now.year,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        status="active"
    )
    
    await db.seasons.insert_one(season.model_dump())
    logger.info(f"New season {season_number} created")
    return season

async def finalize_season(season_id: str):
    """Finalize season and award prizes to top 3"""
    season = await db.seasons.find_one({"id": season_id})
    if not season or season["status"] != "active":
        return
    
    # Get all leagues in this season
    league_ids = season.get("weeks", [])
    if not league_ids:
        # Get all leagues between start and end date
        start_date = datetime.fromisoformat(season["start_date"].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(season["end_date"].replace('Z', '+00:00'))
        
        leagues = await db.leagues.find({
            "start_date": {"$gte": start_date.isoformat()},
            "end_date": {"$lte": end_date.isoformat()}
        }).to_list(100)
        
        league_ids = [l["id"] for l in leagues]
    
    # Calculate total points for each student across all weeks
    student_totals = {}
    for league_id in league_ids:
        league = await db.leagues.find_one({"id": league_id})
        if league:
            for standing in league.get("standings", []):
                user_id = standing["user_id"]
                if user_id not in student_totals:
                    student_totals[user_id] = {
                        "username": standing["username"],
                        "total_points": 0,
                        "weeks_participated": 0
                    }
                student_totals[user_id]["total_points"] += standing.get("points", 0)
                student_totals[user_id]["weeks_participated"] += 1
    
    # Sort by total points
    final_standings = sorted(
        [{"user_id": uid, **data} for uid, data in student_totals.items()],
        key=lambda x: x["total_points"],
        reverse=True
    )
    
    # Add ranks and badges
    badges_awarded = []
    for idx, standing in enumerate(final_standings[:3]):
        standing["rank"] = idx + 1
        
        # Award profile star badge to top 3
        await db.users.update_one(
            {"id": standing["user_id"]},
            {"$set": {"profile_star": True}}
        )
        
        # Award XP bonus
        xp_bonus = [500, 300, 100][idx]  # 1st: 500, 2nd: 300, 3rd: 100
        user = await db.users.find_one({"id": standing["user_id"]})
        if user:
            new_xp = user.get("xp", 0) + xp_bonus
            new_level = calculate_xp_from_level(new_xp)
            await db.users.update_one(
                {"id": standing["user_id"]},
                {"$set": {"xp": new_xp, "level": new_level}}
            )
        
        badges_awarded.append({
            "rank": idx + 1,
            "badge": "🌟" if idx == 0 else "⭐" if idx == 1 else "✨",
            "xp_bonus": xp_bonus
        })
        
        standing["badge"] = badges_awarded[idx]["badge"]
        standing["xp_bonus"] = xp_bonus
    
    # Add ranks to all others
    for idx in range(3, len(final_standings)):
        final_standings[idx]["rank"] = idx + 1
        final_standings[idx]["badge"] = None
    
    # Save season history to user profiles
    for standing in final_standings:
        user = await db.users.find_one({"id": standing["user_id"]})
        if user:
            season_history = user.get("season_history", [])
            season_history.append({
                "season_number": season["season_number"],
                "year": season["year"],
                "rank": standing["rank"],
                "total_points": standing["total_points"],
                "badge": standing.get("badge")
            })
            await db.users.update_one(
                {"id": standing["user_id"]},
                {"$set": {"season_history": season_history}}
            )
    
    # Update season
    await db.seasons.update_one(
        {"id": season_id},
        {"$set": {
            "status": "completed",
            "final_standings": final_standings
        }}
    )
    
    logger.info(f"Season {season['season_number']} finalized. Top 3: {[s['username'] for s in final_standings[:3]]}")
    return final_standings

@api_router.get("/season/current")
async def get_current_season_endpoint(current_user: dict = Depends(get_current_user)):
    """Get current active season"""
    season = await get_current_season()
    
    # Calculate weeks elapsed
    now = datetime.now(timezone.utc)
    start_date = datetime.fromisoformat(season["start_date"].replace('Z', '+00:00'))
    weeks_elapsed = (now - start_date).days // 7
    
    return {
        **season,
        "weeks_elapsed": min(weeks_elapsed, 4),
        "weeks_remaining": max(4 - weeks_elapsed, 0)
    }

@api_router.get("/season/history")
async def get_season_history(current_user: dict = Depends(get_current_user)):
    """Get user's season history"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "season_history": user.get("season_history", []),
        "profile_star": user.get("profile_star", False)
    }

@api_router.get("/season/standings")
async def get_season_standings(current_user: dict = Depends(get_current_user)):
    """Get current season standings"""
    season = await get_current_season()
    
    if season["status"] == "completed":
        return {"standings": season.get("final_standings", [])}
    
    # Calculate current standings from all leagues in season
    start_date = datetime.fromisoformat(season["start_date"].replace('Z', '+00:00'))
    end_date = datetime.fromisoformat(season["end_date"].replace('Z', '+00:00'))
    
    leagues = await db.leagues.find({
        "start_date": {"$gte": start_date.isoformat()},
        "end_date": {"$lte": end_date.isoformat()}
    }).to_list(100)
    
    student_totals = {}
    for league in leagues:
        for standing in league.get("standings", []):
            user_id = standing["user_id"]
            if user_id not in student_totals:
                student_totals[user_id] = {
                    "username": standing["username"],
                    "total_points": 0
                }
            student_totals[user_id]["total_points"] += standing.get("points", 0)
    
    standings = sorted(
        [{"user_id": uid, **data} for uid, data in student_totals.items()],
        key=lambda x: x["total_points"],
        reverse=True
    )
    
    for idx, standing in enumerate(standings):
        standing["rank"] = idx + 1
    
    return {"standings": standings}

# ============= TEACHER PANEL =============

@api_router.get("/teacher/students")
async def get_teacher_students(current_user: dict = Depends(require_role("teacher", "admin"))):
    
    students = await db.users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return students

@api_router.get("/teacher/statistics")
async def get_teacher_statistics(current_user: dict = Depends(require_role("teacher", "admin"))):
    
    total_students = await db.users.count_documents({"role": "student"})
    total_words = await db.words.count_documents({})
    total_games = await db.game_scores.count_documents({})
    
    # Most difficult words (most wrong answers)
    pipeline = [
        {"$group": {"_id": "$game_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    game_stats = await db.game_scores.aggregate(pipeline).to_list(10)
    
    return {
        "total_students": total_students,
        "total_words": total_words,
        "total_games": total_games,
        "game_stats": game_stats
    }

# ============= PERSONALIZED LEARNING PLAN =============

@api_router.get("/learning/personalized-plan")
async def get_personalized_learning_plan(current_user: dict = Depends(get_current_user)):
    """Generate personalized learning plan based on user errors"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    word_errors = user.get("word_errors", {})
    
    # Find categories with most errors
    if word_errors:
        sorted_categories = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)
        weak_categories = [cat for cat, count in sorted_categories[:3]]  # Top 3 weak categories
    else:
        weak_categories = []
    
    # Get words from weak categories
    study_words = []
    if weak_categories:
        words = await db.words.find({
            "category": {"$in": weak_categories}
        }, {"_id": 0}).to_list(100)
        # Select random words from weak categories (12 words)
        study_words = random.sample([w["id"] for w in words], min(12, len(words)))
    else:
        # If no errors, get random words
        words = await db.words.find({}, {"_id": 0}).to_list(100)
        study_words = random.sample([w["id"] for w in words], min(12, len(words)))
    
    # Create or update learning plan
    plan = PersonalizedLearningPlan(
        user_id=current_user["id"],
        weak_categories=weak_categories,
        study_words=study_words,
        study_count=len(study_words)
    )
    
    # Save plan
    await db.personalized_plans.update_one(
        {"user_id": current_user["id"]},
        {"$set": plan.model_dump()},
        upsert=True
    )
    
    # Get word details
    word_details = []
    for word_id in study_words:
        word = await db.words.find_one({"id": word_id}, {"_id": 0})
        if word:
            word_details.append(word)
    
    return {
        "weak_categories": weak_categories,
        "study_words": word_details,
        "study_count": len(study_words),
        "message": f"Sen en çok {', '.join(weak_categories)} kelimelerinde hata yapıyorsun. Bugün {len(study_words)} kelimeyi tekrar edeceksin."
    }

@api_router.post("/games/track-error")
async def track_word_error(word_id: str, category: str, current_user: dict = Depends(get_current_user)):
    """Track word error for personalized learning"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    word_errors = user.get("word_errors", {})
    word_errors[category] = word_errors.get(category, 0) + 1
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"word_errors": word_errors}}
    )
    
    return {"message": "Error tracked", "errors": word_errors}

# ============= PRONUNCIATION TEST =============

@api_router.post("/pronunciation/test")
async def pronunciation_test(test_request: PronunciationTestRequest, current_user: dict = Depends(get_current_user)):
    """AI-based pronunciation scoring (0-100)"""
    # In production, this would use speech recognition API (Google Cloud Speech, Azure Speech, etc.)
    # For now, we'll simulate with a random score or use AI
    
    word = await db.words.find_one({"id": test_request.word_id}, {"_id": 0})
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    # Simulate pronunciation score (0-100)
    # In production: Use speech-to-text API and compare with word pronunciation
    base_score = random.randint(60, 95)  # Simulated score
    
    # Save pronunciation test
    pronunciation = PronunciationTest(
        user_id=current_user["id"],
        word_id=test_request.word_id,
        score=base_score,
        audio_url=test_request.audio_data
    )
    await db.pronunciation_tests.insert_one(pronunciation.model_dump())
    
    # Update user's pronunciation scores
    user = await db.users.find_one({"id": current_user["id"]})
    if user:
        pronunciation_scores = user.get("pronunciation_scores", {})
        if test_request.word_id not in pronunciation_scores:
            pronunciation_scores[test_request.word_id] = []
        pronunciation_scores[test_request.word_id].append(base_score)
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"pronunciation_scores": pronunciation_scores}}
        )
        
        # Check for "Speaker" achievement (90+ average)
        avg_score = sum(pronunciation_scores[test_request.word_id]) / len(pronunciation_scores[test_request.word_id])
        if avg_score >= 90:
            await check_achievements(current_user["id"])
    
    return {
        "score": base_score,
        "word": word["english"],
        "feedback": "Excellent!" if base_score >= 90 else "Good!" if base_score >= 75 else "Practice more!"
    }

@api_router.get("/pronunciation/history")
async def get_pronunciation_history(current_user: dict = Depends(get_current_user)):
    """Get user's pronunciation test history"""
    tests = await db.pronunciation_tests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"tests": tests}

# ============= WORD MATCH GAME =============

@api_router.post("/games/word-match/start")
async def start_word_match_game(game_create: WordMatchGameCreate, current_user: dict = Depends(get_current_user)):
    """Start a word match game (drag-drop)"""
    # Get words based on difficulty
    difficulty_filter = {"difficulty": 1} if game_create.difficulty == "easy" else {}
    words = await db.words.find(difficulty_filter, {"_id": 0}).to_list(50)
    
    if len(words) < 6:
        raise HTTPException(status_code=400, detail="Not enough words for game")
    
    # Select random words
    selected_words = random.sample(words, min(6, len(words)))
    
    # Create word pairs based on match_type
    word_pairs = []
    for word in selected_words:
        if game_create.match_type == "meaning":
            word_pairs.append({
                "word_id": word["id"],
                "word": word["english"],
                "match_target": word["turkish"],
                "match_type": "meaning"
            })
        elif game_create.match_type == "sentence":
            if word.get("example_sentences"):
                example = random.choice(word["example_sentences"])
                word_pairs.append({
                    "word_id": word["id"],
                    "word": word["english"],
                    "match_target": example["sentence"],
                    "match_type": "sentence"
                })
            else:
                word_pairs.append({
                    "word_id": word["id"],
                    "word": word["english"],
                    "match_target": f"Example sentence with {word['english']}",
                    "match_type": "sentence"
                })
    
    # Shuffle targets for game
    targets = [pair["match_target"] for pair in word_pairs]
    random.shuffle(targets)
    
    game = WordMatchGame(
        user_id=current_user["id"],
        word_pairs=word_pairs,
        completed=False
    )
    await db.word_match_games.insert_one(game.model_dump())
    
    return {
        "game_id": game.id,
        "words": [{"word": p["word"], "word_id": p["word_id"]} for p in word_pairs],
        "targets": targets,
        "match_type": game_create.match_type
    }

@api_router.post("/games/word-match/complete")
async def complete_word_match_game(game_id: str, score: int, time_taken: int, current_user: dict = Depends(get_current_user)):
    """Complete word match game and award XP"""
    game = await db.word_match_games.find_one({"id": game_id, "user_id": current_user["id"]})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Update game
    await db.word_match_games.update_one(
        {"id": game_id},
        {"$set": {"completed": True, "score": score, "time_taken": time_taken}}
    )
    
    # Award XP (10 XP per match, bonus for speed)
    xp_earned = score * 10
    if time_taken < 60:  # Completed in under 1 minute
        xp_earned += 50
    
    # Update user XP and level
    user = await db.users.find_one({"id": current_user["id"]})
    if user:
        new_xp = user.get("xp", 0) + xp_earned
        new_level = calculate_xp_from_level(new_xp)
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {
                "$set": {"xp": new_xp, "level": new_level},
                "$inc": {"games_played": 1, "points": score}
            }
        )
        
        await check_achievements(current_user["id"])
    
    return {
        "message": "Game completed",
        "xp_earned": xp_earned,
        "new_level": new_level if user else 1
    }

# ============= STORY MODE (50, 100, 150 words milestones) =============

@api_router.get("/story/unlock")
async def check_story_unlock(current_user: dict = Depends(get_current_user)):
    """Check if user can unlock a new story based on words learned"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    words_learned = user.get("words_learned", 0)
    
    # Check for milestones (50, 100, 150, 200...)
    milestones = [50, 100, 150, 200, 250, 300]
    unlocked_milestones = [m for m in milestones if words_learned >= m]
    
    # Check which stories already unlocked
    existing_stories = await db.story_progress.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    unlocked_counts = [s["words_learned_count"] for s in existing_stories]
    
    # Find next unlockable milestone
    next_milestone = None
    for milestone in milestones:
        if milestone <= words_learned and milestone not in unlocked_counts:
            next_milestone = milestone
            break
    
    return {
        "words_learned": words_learned,
        "unlocked_milestones": unlocked_milestones,
        "next_milestone": next_milestone,
        "can_unlock": next_milestone is not None
    }

@api_router.post("/story/generate")
async def generate_story_for_milestone(request: StoryProgressRequest, current_user: dict = Depends(get_current_user)):
    """Generate story when milestone reached"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    words_learned = user.get("words_learned", 0)
    
    # Check if milestone is valid
    milestones = [50, 100, 150, 200, 250, 300]
    if request.words_learned_count not in milestones or request.words_learned_count > words_learned:
        raise HTTPException(status_code=400, detail="Invalid milestone or not reached yet")
    
    # Check if story already generated for this milestone
    existing = await db.story_progress.find_one({
        "user_id": current_user["id"],
        "words_learned_count": request.words_learned_count
    })
    if existing:
        return {"story": existing["story_content"], "highlighted_words": existing["highlighted_words"]}
    
    # Get learned words to include in story
    words = await db.words.find({}, {"_id": 0}).to_list(100)
    selected_words = random.sample(words, min(10, len(words)))
    word_list = [f"{w['english']} ({w['turkish']})" for w in selected_words]
    
    if not EMERGENT_AVAILABLE:
        # Fallback story
        story_text = f"Once upon a time, there was a student who learned {request.words_learned_count} words. They used words like {', '.join([w['english'] for w in selected_words[:5]])} in their daily life."
        highlighted_word_ids = [w["id"] for w in selected_words[:5]]
    else:
        try:
            system_message = f"Create a short story (3-4 sentences) for English learners. Include these words naturally: {', '.join(word_list)}. Highlight the learned words in the story."
            
            emergent_key = os.environ.get('EMERGENT_LLM_KEY')
            if not emergent_key:
                raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
            
            chat = LlmChat(
                api_key=emergent_key,
                session_id=f"story_{current_user['id']}_{datetime.now().timestamp()}",
                system_message=system_message
            ).with_model("openai", "gpt-4-turbo")
            
            user_message = UserMessage(text=f"Create a story celebrating {request.words_learned_count} words learned")
            response = await chat.send_message(user_message)
            story_text = str(response)
            highlighted_word_ids = [w["id"] for w in selected_words]
        except Exception as e:
            logger.error(f"Story generation error: {e}")
            story_text = f"Congratulations! You've learned {request.words_learned_count} words. Keep learning!"
            highlighted_word_ids = []
    
    # Save story progress
    story_progress = StoryProgress(
        user_id=current_user["id"],
        story_id=str(uuid.uuid4()),
        words_learned_count=request.words_learned_count,
        story_content=story_text,
        highlighted_words=highlighted_word_ids
    )
    await db.story_progress.insert_one(story_progress.model_dump())
    
    return {
        "story": story_text,
        "highlighted_words": highlighted_word_ids,
        "milestone": request.words_learned_count
    }

@api_router.get("/story/history")
async def get_story_history(current_user: dict = Depends(get_current_user)):
    """Get user's story history"""
    stories = await db.story_progress.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("words_learned_count", 1).to_list(100)
    
    return {"stories": stories}

# ============= TEACHER REPORT PANEL =============

@api_router.get("/teacher/reports/students")
async def get_student_reports(current_user: dict = Depends(require_role("teacher", "admin"))):
    """Get detailed student reports for teacher"""
    students = await db.users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    # Calculate weekly stats for each student
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).isoformat()
    week_end = (now + timedelta(days=6-now.weekday())).isoformat()
    
    reports = []
    for student in students:
        # Get weekly game scores
        weekly_scores = await db.game_scores.find({
            "user_id": student["id"],
            "created_at": {"$gte": week_start, "$lte": week_end}
        }).to_list(100)
        
        weekly_words = sum(score.get("correct_answers", 0) for score in weekly_scores)
        
        # Get error categories
        word_errors = student.get("word_errors", {})
        sorted_errors = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)
        top_errors = {cat: count for cat, count in sorted_errors[:5]}
        
        reports.append({
            "student_id": student["id"],
            "username": student["username"],
            "class_name": student.get("class_name"),
            "weekly_words": weekly_words,
            "errors_by_category": top_errors,
            "last_login": student.get("last_login_date") or student.get("last_activity"),
            "level": student.get("level", 1),
            "xp": student.get("xp", 0),
            "words_learned_total": student.get("words_learned", 0),
            "streak": student.get("streak", 0)
        })
    
    return {"reports": reports}

@api_router.post("/teacher/reports/generate-pdf")
async def generate_student_pdf_report(student_id: str, current_user: dict = Depends(require_role("teacher", "admin"))):
    """Generate PDF report for a student (for parent)"""
    student = await db.users.find_one({"id": student_id}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Calculate weekly stats
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).isoformat()
    week_end = (now + timedelta(days=6-now.weekday())).isoformat()
    
    weekly_scores = await db.game_scores.find({
        "user_id": student_id,
        "created_at": {"$gte": week_start, "$lte": week_end}
    }).to_list(100)
    
    weekly_words = sum(score.get("correct_answers", 0) for score in weekly_scores)
    
    # Get error categories
    word_errors = student.get("word_errors", {})
    sorted_errors = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)
    top_error_category = sorted_errors[0][0] if sorted_errors else "None"
    
    # Generate report data
    report_data = {
        "student_name": student["username"],
        "week_start": week_start,
        "week_end": week_end,
        "weekly_words": weekly_words,
        "total_words": student.get("words_learned", 0),
        "top_error_category": top_error_category,
        "level": student.get("level", 1),
        "streak": student.get("streak", 0)
    }
    
    # In production, generate actual PDF using reportlab or similar
    # For now, return JSON data that frontend can convert to PDF
    report = TeacherReport(
        teacher_id=current_user["id"],
        student_id=student_id,
        week_start=week_start,
        week_end=week_end,
        words_learned=weekly_words,
        errors_by_category={cat: count for cat, count in sorted_errors[:5]},
        last_login=student.get("last_login_date"),
        level=student.get("level", 1)
    )
    
    await db.teacher_reports.insert_one(report.model_dump())
    
    return {
        "message": f"{student['username']} bu hafta {weekly_words} kelime öğrendi. En çok '{top_error_category}' grubunda zorlandı.",
        "report_data": report_data,
        "report_id": report.id
    }

@api_router.get("/teacher/reports/class-winners")
async def get_class_winners(current_user: dict = Depends(require_role("teacher", "admin"))):
    """Get class winners from current season"""
    season = await get_current_season()
    
    if season["status"] == "completed":
        standings = season.get("final_standings", [])
    else:
        standings_response = await get_season_standings(current_user)
        standings = standings_response.get("standings", [])
    
    top_10 = standings[:10]
    
    return {
        "season": season["season_number"],
        "winners": top_10,
        "message": f"Sezon {season['season_number']} - İlk 3'e özel rozet kazandı!"
    }

# ============= XP & LEVEL SYSTEM =============

@api_router.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get complete user profile with XP, level, badges"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get achievements
    user_achievements = await db.user_achievements.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    achievement_ids = [ua["achievement_id"] for ua in user_achievements]
    achievements = await db.achievements.find(
        {"id": {"$in": achievement_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate XP progress to next level
    current_xp = user.get("xp", 0)
    current_level = user.get("level", 1)
    xp_for_current_level = calculate_level_xp_required(current_level)
    xp_for_next_level = calculate_level_xp_required(current_level + 1)
    xp_progress = current_xp - xp_for_current_level
    xp_needed = xp_for_next_level - xp_for_current_level
    
    return {
        "id": user["id"],
        "username": user["username"],
        "level": current_level,
        "xp": current_xp,
        "xp_progress": xp_progress,
        "xp_needed": xp_needed,
        "points": user.get("points", 0),
        "words_learned": user.get("words_learned", 0),
        "games_played": user.get("games_played", 0),
        "streak": user.get("streak", 0),
        "profile_star": user.get("profile_star", False),
        "achievements": achievements,
        "season_history": user.get("season_history", [])
    }

# Update game scores to award XP
@api_router.post("/games/scores", response_model=GameScore)
async def create_game_score_with_xp(score_create: GameScoreCreate, current_user: dict = Depends(get_current_user)):
    game_score = GameScore(
        user_id=current_user["id"],
        username=current_user["username"],
        game_type=score_create.game_type,
        score=score_create.score,
        correct_answers=score_create.correct_answers,
        wrong_answers=score_create.wrong_answers,
        completed=score_create.completed
    )
    await db.game_scores.insert_one(game_score.model_dump())
    
    # Update user stats with XP
    now = datetime.now(timezone.utc)
    today = now.date()
    
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate XP (10 XP per correct answer, bonus for perfect games)
    xp_earned = score_create.correct_answers * 10
    if score_create.wrong_answers == 0 and score_create.correct_answers > 0:
        xp_earned += 50  # Perfect game bonus
    
    new_xp = user.get("xp", 0) + xp_earned
    new_level = calculate_xp_from_level(new_xp)
    
    # Daily progress
    last_reset = user.get("last_daily_reset")
    daily_progress = user.get("daily_words_progress", 0)
    
    if last_reset:
        try:
            reset_date = datetime.fromisoformat(last_reset.replace('Z', '+00:00')).date()
            if reset_date < today:
                daily_progress = 0
        except:
            pass
    
    new_daily_progress = daily_progress + score_create.correct_answers
    daily_target = user.get("daily_words_target", 5)
    bonus_points = 0
    if new_daily_progress >= daily_target and daily_progress < daily_target:
        bonus_points = 20
        xp_earned += 30  # Daily goal bonus XP
    
    update_data = {
        "$inc": {
            "points": score_create.score + bonus_points,
            "games_played": 1,
            "words_learned": score_create.correct_answers,
            "xp": xp_earned
        },
        "$set": {
            "last_activity": now.isoformat(),
            "daily_words_progress": new_daily_progress,
            "level": new_level
        }
    }
    
    if not last_reset or (last_reset and datetime.fromisoformat(last_reset.replace('Z', '+00:00')).date() < today):
        update_data["$set"]["last_daily_reset"] = today.isoformat()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        update_data
    )
    
    # Check achievements
    await check_achievements(current_user["id"])
    
    return game_score

# ============= TEXT TO WORDS (Teacher Feature) =============

@api_router.post("/teacher/text-to-words")
async def extract_words_from_text(request: TextToWordsRequest, current_user: dict = Depends(require_role("teacher", "admin"))):
    """Extract words from teacher's text and auto-create word list"""
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI features are not available")
    
    try:
        system_message = """You are an English teacher assistant. Extract all important English words from the given text.
        Return ONLY a JSON array of words with their Turkish translations.
        Format: [{"english": "word", "turkish": "çeviri", "category": "general"}]"""
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"text_to_words_{current_user['id']}_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4-turbo")
        
        user_message = UserMessage(text=f"Extract words from this text:\n\n{request.text}")
        response = await chat.send_message(user_message)
        
        # Parse JSON
        try:
            response_text = str(response)
            json_match = re.search(r'\[[\s\S]*?\]', response_text)
            if json_match:
                words = json.loads(json_match.group(0))
                if isinstance(words, list):
                    created_count = 0
                    for word_data in words:
                        # Check if word exists
                        existing = await db.words.find_one({"english": word_data.get("english", "").lower()})
                        if not existing and request.auto_create:
                            word = Word(
                                english=word_data.get("english", ""),
                                turkish=word_data.get("turkish", ""),
                                category=word_data.get("category", "general"),
                                difficulty=1,
                                created_by=current_user["username"]
                            )
                            await db.words.insert_one(word.model_dump())
                            created_count += 1
                    
                    return {
                        "words_extracted": words,
                        "created_count": created_count,
                        "message": f"{created_count} kelime veritabanına eklendi."
                    }
        except Exception as e:
            logger.error(f"Word extraction error: {e}")
        
        return {"words_extracted": [], "created_count": 0, "error": "Could not extract words"}
    except Exception as e:
        logger.error(f"Text to words error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract words: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    try:
        # Test MongoDB connection
        await client.admin.command('ping')
        logger.info("MongoDB connection successful")
        await initialize_data()
        
        # Check and create weekly league if needed
        await check_weekly_reset()
        
        # Check and create/update season if needed
        await get_current_season()
        
        logger.info("LexiMind Pro API started successfully")
    except Exception as e:
        logger.error("=" * 70)
        logger.error("MONGODB BAĞLANTI HATASI!")
        logger.error("=" * 70)
        logger.error(f"Hata: {e}")
        logger.error("")
        logger.error("ÇÖZÜM:")
        logger.error("1. MongoDB Community Server kurun:")
        logger.error("   https://www.mongodb.com/try/download/community")
        logger.error("")
        logger.error("2. VEYA MongoDB Atlas (bulut) kullanın:")
        logger.error("   https://www.mongodb.com/cloud/atlas")
        logger.error("")
        logger.error("3. MongoDB kurulduktan sonra servisi başlatın")
        logger.error("   (Services > MongoDB > Start veya otomatik başlar)")
        logger.error("")
        logger.error("4. .env dosyasında MONGO_URL'i kontrol edin:")
        logger.error("   Yerel için: mongodb://localhost:27017")
        logger.error("   Atlas için: mongodb+srv://username:password@cluster.mongodb.net/")
        logger.error("=" * 70)
        logger.warning("UYGULAMA BAŞLATILAMADI - MongoDB gereklidir!")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()