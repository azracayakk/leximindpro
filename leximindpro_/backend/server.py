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
from typing import List, Optional, Literal, Dict
from collections import defaultdict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import random
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import emergentintegrations (optional)
# try:
#     from emergentintegrations.llm.chat import llmChat, UserMessage
#     EMERGENT_AVAILABLE = True
# except ImportError:
#     EMERGENT_AVAILABLE = False
#     logger.warning("emergentintegrations not available. AI features will be disabled.")

# AI özellikleri manuel olarak devre dışı bırakıldı (ve gecikme düzeltildi)
EMERGENT_AVAILABLE = True

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

SYSTEM_SETTINGS_ID = "global_settings"
DEFAULT_SYSTEM_SETTINGS = {
    "maintenance_mode": False,
    "feature_flags": {
        "weeklyLeague": True,
        "games": True
    },
    "email": {
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "sender": "no-reply@leximindpro.com"
    },
    "api_keys": {
        "translation": "",
        "tts": ""
    },
    "categories": ["general", "animals", "food", "education", "verbs", "adjectives"]
}


async def get_system_settings():
    settings = await db.system_settings.find_one({"_id": SYSTEM_SETTINGS_ID})
    if not settings:
        settings = {"_id": SYSTEM_SETTINGS_ID, **DEFAULT_SYSTEM_SETTINGS}
        await db.system_settings.insert_one(settings)
    else:
        # Ensure all default keys exist
        merged = DEFAULT_SYSTEM_SETTINGS.copy()
        merged.update({k: settings.get(k, v) for k, v in DEFAULT_SYSTEM_SETTINGS.items()})
        settings = {"_id": SYSTEM_SETTINGS_ID, **merged}
        await db.system_settings.update_one({"_id": SYSTEM_SETTINGS_ID}, {"$set": settings}, upsert=True)
    return settings

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    role: str  # admin, teacher, student
    points: int = 0
    class_name: Optional[str] = None
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
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
    word_errors: dict = {}  # {word_id: error_count} for personalized learning
    pronunciation_scores: dict = {}  # {word_id: [scores]} for pronunciation tracking
    favorites: List[str] = []  # Favorite word IDs
    last_activity: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    class_name: Optional[str] = None
    institution_id: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    points: int
    class_name: Optional[str] = None
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    words_learned: int = 0
    games_played: int = 0

class ExampleSentence(BaseModel):
    sentence: str
    turkish: str

# MongoDB ObjectId için helper class (Pydantic v2 uyumlu)
class PyObjectId(str):
    """MongoDB ObjectId için string wrapper"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not isinstance(v, str):
            raise TypeError('string required')
        return str(v)

# Kelime Yönetimi için yeni modeller
class WordModel(BaseModel):
    """Kelime modeli - Kelime Yönetimi paneli için"""
    model_config = ConfigDict(extra="ignore")
    word: str = Field(..., description="İngilizce kelime (örn: apple)")
    translation: str = Field(..., description="Türkçe çeviri (örn: elma)")
    level: int = Field(..., ge=1, le=3, description="Seviye (1, 2 veya 3)")
    category: str = Field(..., description="Kategori (örn: food, animals, education)")

# Güncelleme için opsiyonel alanlar
class UpdateWordModel(BaseModel):
    """Kelime güncelleme modeli - tüm alanlar opsiyonel"""
    model_config = ConfigDict(extra="ignore")
    word: Optional[str] = Field(None, description="İngilizce kelime")
    translation: Optional[str] = Field(None, description="Türkçe çeviri")
    level: Optional[int] = Field(None, ge=1, le=3, description="Seviye (1, 2 veya 3)")
    category: Optional[str] = Field(None, description="Kategori")

class Word(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    english: str
    turkish: str
    difficulty: int = 1
    category: str = "general"  # A1, A2, B1, B2, C1, general
    synonyms: List[str] = Field(default_factory=list)
    antonyms: List[str] = Field(default_factory=list)
    example_sentences: List[ExampleSentence] = Field(default_factory=list)
    image_url: Optional[str] = None
    created_by: str
    approved: bool = True
    pack_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Classroom(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_by: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClassCreate(BaseModel):
    name: str
    description: Optional[str] = None
    institution_id: Optional[str] = None
    teacher_id: Optional[str] = None

class Institution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    teacher_limit: int = 5
    student_limit: int = 100
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InstitutionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    teacher_limit: int = 5
    student_limit: int = 100

class AssignTeacherRequest(BaseModel):
    teacher_id: str

class WordPack(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    level: Optional[str] = None
    words: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WordPackCreate(BaseModel):
    name: str
    description: Optional[str] = None
    level: Optional[str] = None
    words: List[str] = Field(default_factory=list)

class SystemSettingsUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    feature_flags: Optional[dict] = None
    email: Optional[dict] = None
    api_keys: Optional[dict] = None
    categories: Optional[List[str]] = None

class TeacherStudentCreate(BaseModel):
    username: str
    password: str
    class_name: Optional[str] = None

class WordCreate(BaseModel):
    english: str
    turkish: str
    difficulty: int = 1
    category: str = "general"
    synonyms: List[str] = Field(default_factory=list)
    antonyms: List[str] = Field(default_factory=list)
    example_sentences: List[ExampleSentence] = Field(default_factory=list)

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

class WordAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_by: str
    assigned_by_name: Optional[str] = None
    assigned_to_id: str
    assigned_to_name: str
    assigned_to_type: Literal["student", "class"]
    word_ids: List[str]
    status: str = "assigned"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    due_date: Optional[str] = None

class WordAssignmentCreate(BaseModel):
    assigned_to_id: str
    assigned_to_type: Literal["student", "class"]
    word_ids: List[str]
    due_date: Optional[str] = None

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
    weak_categories: List[str] = []  # Categories with most errors (derived from difficult words)
    study_words: List[str] = []  # Word IDs to study today
    study_count: int = 12  # Number of words to study
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserWordProgress(BaseModel):
    """Spaced Repetition (SRS) - per user & word review state."""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    word_id: str
    ease_factor: float = 2.5
    interval_days: int = 1
    repetition: int = 0
    next_review: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    last_result: Optional[str] = None  # again, hard, good, easy

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

class WeeklyQuizQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    options: List[str]
    correct_option_index: int
    word_id: Optional[str] = None

class WeeklyQuiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_start: str
    week_end: str
    questions: List[WeeklyQuizQuestion]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WeeklyQuizResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    user_id: str
    username: str
    score: int
    total_questions: int
    correct_answers: int
    answers: List[dict] = []
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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
    word_ids: Optional[List[str]] = None  # Optional explicit word IDs to include in story

class QuestionRequest(BaseModel):
    word_ids: List[str]
    question_type: str = "multiple_choice"  # multiple_choice, sentence_fill

class PronunciationTestRequest(BaseModel):
    word_id: str
    audio_data: Optional[str] = None  # Base64 audio or URL
    recognized_text: Optional[str] = None  # Optional speech-to-text result from client

class WordMatchGameCreate(BaseModel):
    match_type: str = "meaning"  # meaning, image, sentence
    difficulty: str = "medium"  # easy, medium, hard

class StoryProgressRequest(BaseModel):
    words_learned_count: int  # To unlock story at milestones

class TextToWordsRequest(BaseModel):
    text: str  # Teacher's text input
    auto_create: bool = True  # Auto-create words from text

class WeeklyQuizSubmission(BaseModel):
    quiz_id: str
    answers: List[dict]

class ReviewUpdate(BaseModel):
    """Incoming review quality rating for a word."""
    word_id: str
    rating: Literal["again", "hard", "good", "easy"]

class FavoritesUpdate(BaseModel):
    word_id: str

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

def get_week_range(reference: Optional[datetime] = None) -> tuple[str, str]:
    """Return ISO formatted start and end datetime for the current ISO week (Monday-Sunday)."""
    if reference is None:
        reference = datetime.now(timezone.utc)
    else:
        # Ensure timezone-aware
        if reference.tzinfo is None:
            reference = reference.replace(tzinfo=timezone.utc)
        else:
            reference = reference.astimezone(timezone.utc)
    week_start = reference - timedelta(days=reference.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)
    return week_start.isoformat(), week_end.isoformat()

def sanitize_quiz_for_student(quiz: dict, include_answers: bool = False) -> dict:
    """Remove sensitive fields from quiz when sending to students."""
    if not quiz:
        return {}
    sanitized = {k: v for k, v in quiz.items() if k != "_id"}
    sanitized_questions = []
    for question in quiz.get("questions", []):
        question_data = {
            "id": question.get("id"),
            "prompt": question.get("prompt"),
            "options": question.get("options", []),
            "word_id": question.get("word_id")
        }
        if include_answers:
            question_data["correct_option_index"] = question.get("correct_option_index")
        sanitized_questions.append(question_data)
    sanitized["questions"] = sanitized_questions
    return sanitized

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

    institution_name = None
    if user_create.institution_id:
        institution = await db.institutions.find_one({"id": user_create.institution_id})
        if not institution:
            raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
        if user_create.role == "teacher":
            teacher_count = await db.users.count_documents({"role": "teacher", "institution_id": user_create.institution_id})
            if teacher_count >= institution.get("teacher_limit", 5):
                raise HTTPException(status_code=400, detail="Bu kurum için öğretmen kotası dolu.")
        if user_create.role == "student":
            student_count = await db.users.count_documents({"role": "student", "institution_id": user_create.institution_id})
            if student_count >= institution.get("student_limit", 100):
                raise HTTPException(status_code=400, detail="Bu kurum için öğrenci kotası dolu.")
        institution_name = institution.get("name")
    
    user = User(
        username=user_create.username,
        password=hash_password(user_create.password),
        role=user_create.role,
        class_name=user_create.class_name,
        institution_id=user_create.institution_id,
        institution_name=institution_name
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

# Kelime Yönetimi için yeni endpoint (WordModel kullanarak)
@api_router.post("/v1/words", status_code=status.HTTP_201_CREATED)
async def create_word_v1(word: WordModel, current_user: dict = Depends(require_role("admin", "teacher"))):
    """
    Admin panelinden yeni bir kelime oluşturur.
    WordModel kullanarak basit kelime ekleme.
    """
    try:
        # Gelen veriyi MongoDB'ye uygun formata çevir
        # WordModel -> Word formatına dönüştür
        new_word_data = {
            "id": str(uuid.uuid4()),
            "english": word.word,
            "turkish": word.translation,
            "difficulty": word.level,
            "category": word.category,
            "synonyms": [],
            "antonyms": [],
            "example_sentences": [],
            "created_by": current_user["username"],
            "approved": True,
            "pack_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Aynı kelime zaten var mı kontrol et
        existing = await db.words.find_one({"english": word.word.lower()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{word.word}' kelimesi zaten mevcut."
            )
        
        # Veritabanına ekle
        result = await db.words.insert_one(new_word_data)
        
        if result.inserted_id:
            return {
                "status": "success",
                "message": "Kelime başarıyla eklendi",
                "id": new_word_data["id"],
                "word": word.word,
                "translation": word.translation
            }
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kelime eklenirken bir hata oluştu."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Word creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kelime eklenirken bir hata oluştu: {str(e)}"
        )

@api_router.post("/words", response_model=Word)
async def create_word(word_create: WordCreate, current_user: dict = Depends(require_role("admin", "teacher"))):
    
    word = Word(
        english=word_create.english,
        turkish=word_create.turkish,
        difficulty=word_create.difficulty,
        category=word_create.category,
        synonyms=word_create.synonyms,
        antonyms=word_create.antonyms,
        example_sentences=word_create.example_sentences,
        created_by=current_user["username"]
    )
    await db.words.insert_one(word.model_dump())
    return word

# Kelime Yönetimi için GET endpoint (WordModel formatında)
@api_router.get("/v1/words")
async def get_all_words_v1(current_user: dict = Depends(get_current_user)):
    """
    Veritabanındaki tüm kelimeleri listeler.
    WordModel formatında döndürür (word, translation, level, category).
    """
    words_list = []
    
    # 'words' koleksiyonundaki tüm belgeleri bul
    words_cursor = db.words.find({}, {"_id": 0})  # _id'yi zaten dahil etmiyoruz
    
    async for word in words_cursor:
        # WordModel formatına dönüştür (english -> word, turkish -> translation, difficulty -> level)
        word_model = {
            "id": word.get("id", ""),
            "word": word.get("english", ""),
            "translation": word.get("turkish", ""),
            "level": word.get("difficulty", 1),
            "category": word.get("category", "general")
        }
        words_list.append(word_model)
    
    return words_list

@api_router.get("/words", response_model=List[Word])
async def get_words(current_user: dict = Depends(get_current_user)):
    words = await db.words.find({}, {"_id": 0}).to_list(1000)
    return [Word(**word) for word in words]

# Kelime Yönetimi için DELETE endpoint (v1)
@api_router.delete("/v1/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_word_v1(word_id: str, current_user: dict = Depends(require_role("admin", "teacher"))):
    """
    ID'ye göre bir kelimeyi siler.
    """
    # MongoDB'de id alanını kullanarak sil (ObjectId değil, string id kullanıyoruz)
    delete_result = await db.words.delete_one({"id": word_id})
    
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelime (ID: {word_id}) bulunamadı."
        )
    
    return None  # 204 No Content için None döndür

# Kelime Yönetimi için UPDATE endpoint (v1)
@api_router.put("/v1/words/{word_id}")
async def update_word_v1(
    word_id: str,
    word_update: UpdateWordModel,
    current_user: dict = Depends(require_role("admin", "teacher"))
):
    """
    ID'ye göre bir kelimeyi günceller.
    Sadece gönderilen alanlar güncellenir.
    """
    # Önce kelimeyi bul
    existing_word = await db.words.find_one({"id": word_id})
    if not existing_word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelime (ID: {word_id}) bulunamadı."
        )
    
    # Güncellenecek alanları hazırla
    update_data = {}
    
    if word_update.word is not None:
        # Aynı kelime zaten var mı kontrol et (kendisi hariç)
        existing = await db.words.find_one({
            "english": word_update.word.lower(),
            "id": {"$ne": word_id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{word_update.word}' kelimesi zaten mevcut."
            )
        update_data["english"] = word_update.word
    
    if word_update.translation is not None:
        update_data["turkish"] = word_update.translation
    
    if word_update.level is not None:
        update_data["difficulty"] = word_update.level
    
    if word_update.category is not None:
        update_data["category"] = word_update.category
    
    # Hiçbir alan güncellenmemişse hata döndür
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Güncellenecek alan belirtilmedi."
        )
    
    # Veritabanını güncelle
    result = await db.words.update_one(
        {"id": word_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelime (ID: {word_id}) bulunamadı."
        )
    
    # Güncellenmiş kelimeyi getir
    updated_word = await db.words.find_one({"id": word_id}, {"_id": 0})
    
    # WordModel formatına dönüştür
    return {
        "status": "success",
        "message": "Kelime başarıyla güncellendi",
        "word": {
            "id": updated_word.get("id", ""),
            "word": updated_word.get("english", ""),
            "translation": updated_word.get("turkish", ""),
            "level": updated_word.get("difficulty", 1),
            "category": updated_word.get("category", "general")
        }
    }

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
    try:
        # Get some words to include in the story
        if story_request.word_ids:
            words = await db.words.find({"id": {"$in": story_request.word_ids}}, {"_id": 0}).to_list(20)
        else:
            words = await db.words.find({}, {"_id": 0}).to_list(20)
        word_list = [f"{w['english']}" for w in random.sample(words, min(5, len(words)))]
        
        topic = story_request.topic or "a day at school"
        
        # OpenAI API kullan
        # .env dosyasını tekrar yükle (runtime'da değişiklik olabilir)
        load_dotenv(ROOT_DIR / '.env', override=True)
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            # Debug: .env dosyasının varlığını kontrol et
            env_path = ROOT_DIR / '.env'
            if not env_path.exists():
                raise HTTPException(status_code=500, detail=f"OPENAI_API_KEY is not configured. .env file not found at {env_path}")
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env file.")
        
        client = OpenAI(api_key=openai_key)
        
        prompt = f"""You are an English teacher. Create a short story (3-4 sentences) for {story_request.difficulty} level students about {topic}. 
        
Include these words in the story: {', '.join(word_list)}.

Make it educational and fun. Write only the story, nothing else."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an English teacher helping students learn vocabulary through stories."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        story_text = response.choices[0].message.content.strip()
        
        return {
            "story": story_text,
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
    try:
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            # Fallback examples
            return {"examples": [
                {"sentence": f"I use {request.word} every day.", "turkish": f"Her gün {request.turkish} kullanırım."},
                {"sentence": f"This {request.word} is good.", "turkish": f"Bu {request.turkish} iyidir."},
                {"sentence": f"She likes {request.word}.", "turkish": f"O {request.turkish} seviyor."}
            ]}
        
        client = OpenAI(api_key=openai_key)
        
        prompt = f"""You are an English teacher. Create {request.count} simple example sentences for language learners.

Rules:
- Use the word "{request.word}" in each sentence
- Level: {request.level}
- Keep sentences short and clear (max 12 words)
- Use simple grammar
- Return ONLY valid JSON array format

Format: [{{"sentence": "English sentence.", "turkish": "Türkçe çeviri."}}]

Create {request.count} example sentences using the word '{request.word}' ({request.turkish})."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an English teacher. Always return valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON response with improved extraction
        try:
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
                synonyms=word_data.get("synonyms", []),
                antonyms=word_data.get("antonyms", []),
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
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env file.")
        
        client = OpenAI(api_key=openai_key)
        
        prompt = f"""You are an English teacher. Generate 3 multiple choice questions using the provided words.

Words: {', '.join(word_list)}

Return ONLY a JSON array of questions in this format:
[{{"question": "What does [word] mean?", "options": ["Option A", "Option B", "Option C", "Option D"], "correct": 0}}]

Create 3 multiple choice questions using these words."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an English teacher. Always return valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            json_match = re.search(r'\[[\s\S]*?\]', response_text)
            if json_match:
                questions = json.loads(json_match.group(0))
                if isinstance(questions, list):
                    return {"questions": questions, "words_used": word_list}
        except Exception as e:
            logger.warning(f"Question JSON parsing failed: {e}")
        
        return {"questions": [], "words_used": word_list}
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

# ============= WEEKLY QUIZ =============

async def create_weekly_quiz(week_start: str, week_end: str) -> dict:
    all_words = await db.words.find({}, {"_id": 0}).to_list(500)
    if len(all_words) < 4:
        raise ValueError("Quiz oluşturmak için yeterli kelime yok. Lütfen kelime listesine yeni içerikler ekleyin.")
    
    question_pool_size = min(8, len(all_words))
    question_words = random.sample(all_words, question_pool_size)
    questions: List[WeeklyQuizQuestion] = []
    
    for word in question_words:
        other_options = [w["turkish"] for w in all_words if w["id"] != word["id"]]
        distractor_count = min(3, len(other_options))
        distractors = random.sample(other_options, distractor_count) if distractor_count > 0 else []
        
        options = distractors + [word["turkish"]]
        random.shuffle(options)
        correct_index = options.index(word["turkish"])
        
        questions.append(
            WeeklyQuizQuestion(
                prompt=f'"{word["english"]}" kelimesinin Türkçe karşılığı nedir?',
                options=options,
                correct_option_index=correct_index,
                word_id=word.get("id")
            )
        )
    
    quiz = WeeklyQuiz(
        week_start=week_start,
        week_end=week_end,
        questions=questions
    )
    quiz_data = quiz.model_dump()
    await db.weekly_quizzes.insert_one(quiz_data)
    return quiz_data

@api_router.get("/quizzes/weekly")
async def get_weekly_quiz(current_user: dict = Depends(get_current_user)):
    week_start, week_end = get_week_range()
    quiz = await db.weekly_quizzes.find_one({"week_start": week_start})
    if not quiz:
        try:
            quiz = await create_weekly_quiz(week_start, week_end)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    
    result = await db.weekly_quiz_results.find_one(
        {"quiz_id": quiz["id"], "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    sanitized_quiz = sanitize_quiz_for_student(quiz, include_answers=result is not None)
    
    return {
        "quiz": sanitized_quiz,
        "completed": result is not None,
        "result": result
    }

@api_router.post("/quizzes/weekly/submit")
async def submit_weekly_quiz(submission: WeeklyQuizSubmission, current_user: dict = Depends(get_current_user)):
    quiz = await db.weekly_quizzes.find_one({"id": submission.quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz bulunamadı")
    
    existing_result = await db.weekly_quiz_results.find_one({
        "quiz_id": submission.quiz_id,
        "user_id": current_user["id"]
    })
    if existing_result:
        raise HTTPException(status_code=400, detail="Bu haftaki quiz zaten tamamlandı")
    
    question_map = {q["id"]: q for q in quiz.get("questions", [])}
    if not question_map:
        raise HTTPException(status_code=400, detail="Quiz soruları eksik")
    
    evaluated_answers = []
    correct_count = 0
    
    for answer in submission.answers:
        question_id = answer.get("question_id")
        selected_option = answer.get("selected_option")
        if question_id not in question_map or selected_option is None:
            continue
        
        question = question_map[question_id]
        is_correct = selected_option == question.get("correct_option_index")
        if is_correct:
            correct_count += 1
        
        evaluated_answers.append({
            "question_id": question_id,
            "selected_option": selected_option,
            "correct_option_index": question.get("correct_option_index"),
            "is_correct": is_correct
        })
    
    total_questions = len(question_map)
    if len(evaluated_answers) != total_questions:
        raise HTTPException(status_code=400, detail="Lütfen tüm soruları yanıtlayın")
    
    score = int(round((correct_count / total_questions) * 100)) if total_questions else 0
    
    result = WeeklyQuizResult(
        quiz_id=quiz["id"],
        user_id=current_user["id"],
        username=current_user.get("username", ""),
        score=score,
        total_questions=total_questions,
        correct_answers=correct_count,
        answers=evaluated_answers
    )
    
    result_data = result.model_dump()
    await db.weekly_quiz_results.insert_one(result_data)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {"last_activity": datetime.now(timezone.utc).isoformat()},
            "$inc": {"points": correct_count * 5}
        }
    )
    
    sanitized_quiz = sanitize_quiz_for_student(quiz, include_answers=True)
    
    return {
        "message": "Quiz sonuçların kaydedildi",
        "score": score,
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "quiz": sanitized_quiz,
        "result": {k: v for k, v in result_data.items() if k != "_id"}
    }

# ============= TEACHER PANEL =============

@api_router.post("/teacher/classes")
async def create_teacher_class(
    class_data: ClassCreate,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    name = class_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Sınıf adı boş olamaz.")

    existing_class = await db.classes.find_one({"name": name})
    if existing_class:
        raise HTTPException(status_code=400, detail="Bu sınıf adı zaten kullanılıyor.")

    classroom = Classroom(
        name=name,
        description=class_data.description.strip() if class_data.description else None,
        created_by=current_user["id"]
    )
    await db.classes.insert_one(classroom.model_dump())

    class_payload = classroom.model_dump()
    class_payload.pop("created_by", None)
    class_payload["student_count"] = 0

    return {"message": "Sınıf oluşturuldu.", "class": class_payload}


@api_router.get("/teacher/classes")
async def get_teacher_classes(current_user: dict = Depends(require_role("teacher", "admin"))):

    classes_cursor = db.classes.find({}, {"_id": 0})
    classes: List[dict] = []
    async for classroom in classes_cursor:
        class_copy = classroom.copy()
        class_copy.pop("created_by", None)
        student_count = await db.users.count_documents({
            "role": "student",
            "class_name": classroom.get("name")
        })
        class_copy["student_count"] = student_count
        classes.append(class_copy)

    classes.sort(key=lambda cls: cls.get("name", "").lower())
    return classes


@api_router.post("/teacher/students")
async def create_teacher_student(
    student_data: TeacherStudentCreate,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    username = student_data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Öğrenci kullanıcı adı boş olamaz.")

    if len(student_data.password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır.")

    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor.")

    class_name = student_data.class_name.strip() if student_data.class_name else None
    if class_name:
        existing_class = await db.classes.find_one({"name": class_name})
        if not existing_class:
            raise HTTPException(status_code=404, detail="Sınıf bulunamadı.")

    user = User(
        username=username,
        password=hash_password(student_data.password),
        role="student",
        class_name=class_name
    )
    await db.users.insert_one(user.model_dump())

    student_payload = user.model_dump()
    student_payload.pop("password", None)

    return {"message": "Öğrenci oluşturuldu.", "student": student_payload}


@api_router.get("/teacher/students")
async def get_teacher_students(current_user: dict = Depends(require_role("teacher", "admin"))):
    
    students = await db.users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return students


@api_router.get("/teacher/words")
async def get_teacher_words(current_user: dict = Depends(require_role("teacher", "admin"))):
    query = {
        "$or": [
            {"approved": True},
            {"approved": {"$exists": False}},
            {"created_by": current_user["username"]}
        ]
    }
    words = await db.words.find(query, {"_id": 0}).sort("english", 1).to_list(1000)
    for word in words:
        if "approved" not in word:
            word["approved"] = True
    return words

@api_router.post("/teacher/words")
async def create_teacher_word(
    word_create: WordCreate,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    english = word_create.english.strip()
    turkish = word_create.turkish.strip()
    if not english or not turkish:
        raise HTTPException(status_code=400, detail="Kelime ve anlamı boş olamaz.")

    existing = await db.words.find_one({"english": english})
    if existing:
        raise HTTPException(status_code=400, detail="Bu kelime zaten eklenmiş.")

    word = Word(
        english=english,
        turkish=turkish,
        difficulty=word_create.difficulty,
        category=word_create.category or "general",
        created_by=current_user["username"],
        approved=current_user.get("role") == "admin"
    )
    await db.words.insert_one(word.model_dump())
    payload = word.model_dump()
    payload.pop("_id", None)
    return {"message": "Kelime başarıyla eklendi.", "word": payload}


@api_router.put("/teacher/words/{word_id}")
async def update_teacher_word(
    word_id: str,
    word_update: WordCreate,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    update_data = {
        "english": word_update.english.strip(),
        "turkish": word_update.turkish.strip(),
        "difficulty": word_update.difficulty,
        "category": word_update.category or "general"
    }

    if not update_data["english"] or not update_data["turkish"]:
        raise HTTPException(status_code=400, detail="Kelime ve anlamı boş olamaz.")

    existing = await db.words.find_one({"id": word_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")

    if current_user.get("role") != "admin" and existing.get("created_by") != current_user["username"]:
        raise HTTPException(status_code=403, detail="Bu kelime üzerinde değişiklik yapma yetkiniz yok.")

    if current_user.get("role") != "admin":
        update_data["approved"] = False

    await db.words.update_one(
        {"id": word_id},
        {"$set": update_data}
    )

    return {"message": "Kelime güncellendi."}


@api_router.delete("/teacher/words/{word_id}")
async def delete_teacher_word(
    word_id: str,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    if current_user.get("role") == "admin":
        result = await db.words.delete_one({"id": word_id})
    else:
        result = await db.words.delete_one({"id": word_id, "created_by": current_user["username"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı veya bu kelimeyi silme izniniz yok.")
    return {"message": "Kelime silindi."}

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


@api_router.get("/admin/system-report")
async def get_admin_system_report(current_user: dict = Depends(require_role("admin"))):
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_of_week = start_of_day - timedelta(days=start_of_day.weekday())
    active_threshold = now - timedelta(minutes=30)

    start_day_iso = start_of_day.isoformat()
    start_week_iso = start_of_week.isoformat()
    active_iso = active_threshold.isoformat()

    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_students = await db.users.count_documents({"role": "student"})
    new_today = await db.users.count_documents({"created_at": {"$gte": start_day_iso}})
    new_week = await db.users.count_documents({"created_at": {"$gte": start_week_iso}})
    active_users = await db.users.count_documents({"last_activity": {"$gte": active_iso}})

    total_words = await db.words.count_documents({"$or": [{"approved": True}, {"approved": {"$exists": False}}]})

    popular_pipeline = [
        {"$match": {"role": "student"}},
        {"$project": {"word_errors": {"$objectToArray": "$word_errors"}}},
        {"$unwind": "$word_errors"},
        {"$group": {"_id": "$word_errors.k", "count": {"$sum": "$word_errors.v"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular_words = await db.users.aggregate(popular_pipeline).to_list(5)
    if not popular_words:
        sample_words = await db.words.find({}, {"_id": 0, "id": 1, "english": 1, "turkish": 1}).limit(5).to_list(5)
        popular_words = [
            {"_id": w["id"], "count": 0, "turkish": w.get("turkish"), "english": w.get("english")}
            for w in sample_words
        ]
    else:
        word_map = {
            w["id"]: w
            for w in await db.words.find({}, {"_id": 0, "id": 1, "english": 1, "turkish": 1}).to_list(1000)
        }
        for item in popular_words:
            word_info = word_map.get(item["_id"])
            if word_info:
                item["turkish"] = word_info.get("turkish")
                item["english"] = word_info.get("english")

    games_window = now - timedelta(days=6)
    scores = await db.game_scores.find({"created_at": {"$gte": games_window.isoformat()}}, {"_id": 0, "created_at": 1}).to_list(5000)
    daily_games_map: Dict[str, int] = defaultdict(int)
    for score in scores:
        created_at = score.get("created_at")
        if created_at:
            try:
                date_key = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date().isoformat()
            except Exception:
                date_key = created_at[:10]
            daily_games_map[date_key] += 1
    daily_games = []
    for i in range(7):
        day = (games_window + timedelta(days=i)).date().isoformat()
        daily_games.append({"date": day, "count": daily_games_map.get(day, 0)})

    league = await db.leagues.find_one(sort=[("year", -1), ("week_number", -1)])
    top_league = []
    if league:
        top_league = league.get("standings", [])[:5]

    report = {
        "generated_at": now.isoformat(),
        "users": {
            "total_teachers": total_teachers,
            "total_students": total_students,
            "new_today": new_today,
            "new_this_week": new_week,
            "active_now": active_users
        },
        "content": {
            "total_words": total_words,
            "popular_words": popular_words
        },
        "activity": {
            "daily_games": daily_games,
            "league_top": top_league
        }
    }
    return report


@api_router.post("/admin/institutions")
async def create_institution(
    institution_data: InstitutionCreate,
    current_user: dict = Depends(require_role("admin"))
):
    name = institution_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Kurum adı boş olamaz.")

    existing = await db.institutions.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bir kurum zaten mevcut.")

    institution = Institution(
        name=name,
        description=institution_data.description,
        teacher_limit=max(1, institution_data.teacher_limit),
        student_limit=max(1, institution_data.student_limit)
    )
    await db.institutions.insert_one(institution.model_dump())
    payload = institution.model_dump()
    payload.pop("_id", None)
    return {"message": "Kurum oluşturuldu.", "institution": payload}


@api_router.get("/admin/institutions")
async def get_institutions(current_user: dict = Depends(require_role("admin"))):
    institutions = await db.institutions.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    response = []
    for inst in institutions:
        inst_id = inst["id"]
        teacher_count = await db.users.count_documents({"role": "teacher", "institution_id": inst_id})
        student_count = await db.users.count_documents({"role": "student", "institution_id": inst_id})
        classes = await db.classes.find({"institution_id": inst_id}, {"_id": 0}).sort("name", 1).to_list(200)
        response.append({
            **inst,
            "teacher_count": teacher_count,
            "student_count": student_count,
            "class_count": len(classes),
            "classes": classes
        })
    return {"institutions": response}


@api_router.post("/admin/institutions/{institution_id}/assign-teacher")
async def assign_teacher_to_institution(
    institution_id: str,
    assignment: AssignTeacherRequest,
    current_user: dict = Depends(require_role("admin"))
):
    institution = await db.institutions.find_one({"id": institution_id})
    if not institution:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")

    teacher = await db.users.find_one({"id": assignment.teacher_id})
    if not teacher or teacher.get("role") != "teacher":
        raise HTTPException(status_code=404, detail="Öğretmen bulunamadı.")

    teacher_count = await db.users.count_documents({"role": "teacher", "institution_id": institution_id})
    if teacher_count >= institution.get("teacher_limit", 5):
        raise HTTPException(status_code=400, detail="Bu kurum için öğretmen kotası dolu.")

    await db.users.update_one(
        {"id": assignment.teacher_id},
        {"$set": {"institution_id": institution_id, "institution_name": institution.get("name")}}
    )

    return {"message": f"{teacher['username']} kullanıcısı {institution['name']} kurumuna atandı."}


@api_router.post("/admin/institutions/{institution_id}/classes")
async def create_institution_class(
    institution_id: str,
    class_data: ClassCreate,
    current_user: dict = Depends(require_role("admin"))
):
    institution = await db.institutions.find_one({"id": institution_id})
    if not institution:
        raise HTTPException(status_code=404, detail="Kurum bulunamadı.")

    teacher = None
    if class_data.teacher_id:
        teacher = await db.users.find_one({"id": class_data.teacher_id})
        if not teacher or teacher.get("role") != "teacher":
            raise HTTPException(status_code=404, detail="Atanacak öğretmen bulunamadı.")
        if teacher.get("institution_id") not in (None, institution_id):
            raise HTTPException(status_code=400, detail="Öğretmen farklı bir kurumda kayıtlı.")
        if teacher.get("institution_id") != institution_id:
            await db.users.update_one(
                {"id": teacher["id"]},
                {"$set": {"institution_id": institution_id, "institution_name": institution["name"]}}
            )

    classroom = Classroom(
        name=class_data.name,
        description=class_data.description,
        created_by=current_user["username"],
        institution_id=institution_id,
        institution_name=institution.get("name"),
        teacher_id=teacher.get("id") if teacher else None,
        teacher_name=teacher.get("username") if teacher else None
    )
    await db.classes.insert_one(classroom.model_dump())
    payload = classroom.model_dump()
    payload.pop("_id", None)
    return {"message": "Sınıf oluşturuldu.", "class": payload}


@api_router.get("/admin/master-words")
async def get_master_words(current_user: dict = Depends(require_role("admin"))):
    pending_words = await db.words.find({"approved": False}, {"_id": 0}).sort("created_at", 1).to_list(500)
    approved_count = await db.words.count_documents({"$or": [{"approved": True}, {"approved": {"$exists": False}}]})
    word_packs = await db.word_packs.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    settings = await get_system_settings()
    return {
        "pending_words": pending_words,
        "approved_count": approved_count,
        "word_packs": word_packs,
        "categories": settings.get("categories", [])
    }


@api_router.post("/admin/words/{word_id}/approve")
async def approve_word(word_id: str, current_user: dict = Depends(require_role("admin"))):
    result = await db.words.update_one({"id": word_id}, {"$set": {"approved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")
    return {"message": "Kelime onaylandı."}


@api_router.post("/admin/word-packs")
async def create_word_pack(
    pack_data: WordPackCreate,
    current_user: dict = Depends(require_role("admin"))
):
    name = pack_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Paket adı boş olamaz.")

    existing = await db.word_packs.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Bu adla bir kelime paketi zaten mevcut.")

    words_input = [w.strip() for w in pack_data.words if w.strip()]
    if words_input:
        approved_words = await db.words.find(
            {
                "english": {"$in": words_input},
                "$or": [{"approved": True}, {"approved": {"$exists": False}}]
            },
            {"_id": 0, "english": 1}
        ).to_list(len(words_input))
        approved_set = {w["english"] for w in approved_words}
        missing = [w for w in words_input if w not in approved_set]
        if missing:
            raise HTTPException(status_code=400, detail=f"Şu kelimeler bulunamadı veya onaylı değil: {', '.join(missing)}")

    word_pack = WordPack(
        name=name,
        description=pack_data.description,
        level=pack_data.level,
        words=words_input
    )
    await db.word_packs.insert_one(word_pack.model_dump())
    payload = word_pack.model_dump()
    payload.pop("_id", None)
    return {"message": "Kelime paketi oluşturuldu.", "word_pack": payload}


@api_router.get("/admin/system-settings")
async def read_system_settings(current_user: dict = Depends(require_role("admin"))):
    settings = await get_system_settings()
    settings_copy = settings.copy()
    settings_copy.pop("_id", None)
    return settings_copy


@api_router.put("/admin/system-settings")
async def update_system_settings(
    update: SystemSettingsUpdate,
    current_user: dict = Depends(require_role("admin"))
):
    settings = await get_system_settings()
    update_data = {}

    if update.maintenance_mode is not None:
        update_data["maintenance_mode"] = update.maintenance_mode
    if update.feature_flags is not None:
        merged_flags = settings.get("feature_flags", {}).copy()
        merged_flags.update(update.feature_flags)
        update_data["feature_flags"] = merged_flags
    if update.email is not None:
        merged_email = settings.get("email", {}).copy()
        merged_email.update(update.email)
        update_data["email"] = merged_email
    if update.api_keys is not None:
        merged_keys = settings.get("api_keys", {}).copy()
        merged_keys.update(update.api_keys)
        update_data["api_keys"] = merged_keys
    if update.categories is not None:
        update_data["categories"] = sorted(set(update.categories))

    if update_data:
        await db.system_settings.update_one(
            {"_id": SYSTEM_SETTINGS_ID},
            {"$set": update_data},
            upsert=True
        )

    new_settings = await get_system_settings()
    new_settings.pop("_id", None)
    return {"message": "Ayarlar güncellendi.", "settings": new_settings}
@api_router.get("/teacher/students/summary")
async def get_teacher_student_summary(current_user: dict = Depends(require_role("teacher", "admin"))):
    
    summaries = []
    students_cursor = db.users.find(
        {"role": "student"},
        {"_id": 0, "password": 0}
    )
    
    async for student in students_cursor:
        quiz_results = await db.weekly_quiz_results.find(
            {"user_id": student["id"]},
            {"_id": 0}
        ).sort("submitted_at", -1).to_list(20)
        
        completion_count = len(quiz_results)
        average_score = None
        best_score = None
        last_quiz = quiz_results[0] if quiz_results else None
        
        if quiz_results:
            total_score = sum(res.get("score", 0) for res in quiz_results)
            average_score = total_score / completion_count if completion_count else None
            best_score = max(res.get("score", 0) for res in quiz_results)
        
        summaries.append({
            "id": student["id"],
            "username": student["username"],
            "class_name": student.get("class_name"),
            "points": student.get("points", 0),
            "words_learned": student.get("words_learned", 0),
            "games_played": student.get("games_played", 0),
            "streak": student.get("streak", 0),
            "last_login_date": student.get("last_login_date"),
            "average_quiz_score": round(average_score, 1) if average_score is not None else None,
            "best_quiz_score": best_score,
            "last_quiz_score": last_quiz.get("score") if last_quiz else None,
            "last_quiz_submitted_at": last_quiz.get("submitted_at") if last_quiz else None,
            "weekly_quiz_completion_count": completion_count
        })
    
    summaries.sort(
        key=lambda s: (s["average_quiz_score"] is None, -(s["average_quiz_score"] or 0))
    )
    
    return {"students": summaries}

def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            return value
        if isinstance(value, dict) and "$date" in value:
            value = value["$date"]
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, tz=timezone.utc)
        if isinstance(value, str) and value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except Exception:
        return None

@api_router.get("/teacher/students/{student_id}/profile")
async def get_teacher_student_profile(student_id: str, current_user: dict = Depends(require_role("teacher", "admin"))):
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")

    quiz_history = await db.weekly_quiz_results.find(
        {"user_id": student_id},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(20)

    game_history = await db.game_scores.find(
        {"user_id": student_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=29)

    daily_activity_map: Dict[str, Dict[str, int]] = {}

    for score in game_history:
        activity_date = _parse_iso_datetime(score.get("created_at"))
        if not activity_date:
            continue
        activity_key = activity_date.date().isoformat()
        if activity_date.date() < start_date or activity_date.date() > today:
            continue
        if activity_key not in daily_activity_map:
            daily_activity_map[activity_key] = {"games_played": 0, "correct_answers": 0}
        daily_activity_map[activity_key]["games_played"] += 1
        daily_activity_map[activity_key]["correct_answers"] += score.get("correct_answers", 0)

    for quiz in quiz_history:
        activity_date = _parse_iso_datetime(quiz.get("submitted_at"))
        if not activity_date:
            continue
        activity_key = activity_date.date().isoformat()
        if activity_date.date() < start_date or activity_date.date() > today:
            continue
        if activity_key not in daily_activity_map:
            daily_activity_map[activity_key] = {"games_played": 0, "correct_answers": 0}
        daily_activity_map[activity_key]["quizzes_completed"] = daily_activity_map[activity_key].get("quizzes_completed", 0) + 1

    daily_activity = []
    for day_index in range(30):
        day = start_date + timedelta(days=day_index)
        key = day.isoformat()
        metrics = daily_activity_map.get(key, {})
        daily_activity.append({
            "date": key,
            "games_played": metrics.get("games_played", 0),
            "correct_answers": metrics.get("correct_answers", 0),
            "quizzes_completed": metrics.get("quizzes_completed", 0)
        })

    level = student.get("level") or 1
    points = student.get("points", 0)
    progress_to_next = points % 100

    return {
        "student": student,
        "quiz_history": quiz_history,
        "game_history": game_history,
        "daily_activity": daily_activity,
        "level_summary": {
            "level": level,
            "points": points,
            "progress_percent": progress_to_next,
            "points_to_next": max(0, 100 - progress_to_next)
        }
    }

@api_router.get("/teacher/statistics/class-activity")
async def get_teacher_class_activity(
    days: int = 30,
    class_name: Optional[str] = None,
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    days = min(max(days, 1), 120)
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)

    date_filter_start = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    date_filter_end = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc).isoformat()

    activity_map: Dict[str, set] = defaultdict(set)
    class_student_ids: Optional[set[str]] = None

    if class_name:
        class_students_cursor = db.users.find(
            {"role": "student", "class_name": class_name},
            {"_id": 0, "id": 1}
        )
        class_student_ids = set()
        async for student in class_students_cursor:
            class_student_ids.add(student["id"])

        if not class_student_ids:
            return {
                "heatmap": []
            }

    game_scores = await db.game_scores.find(
        {"created_at": {"$gte": date_filter_start, "$lte": date_filter_end}},
        {"_id": 0, "user_id": 1, "created_at": 1}
    ).to_list(5000)

    for score in game_scores:
        created_at = _parse_iso_datetime(score.get("created_at"))
        if not created_at:
            continue
        user_id = score.get("user_id")
        if class_student_ids is not None and user_id not in class_student_ids:
            continue
        activity_map[created_at.date().isoformat()].add(user_id)

    quiz_results = await db.weekly_quiz_results.find(
        {"submitted_at": {"$gte": date_filter_start, "$lte": date_filter_end}},
        {"_id": 0, "user_id": 1, "submitted_at": 1}
    ).to_list(5000)

    for result in quiz_results:
        submitted_at = _parse_iso_datetime(result.get("submitted_at"))
        if not submitted_at:
            continue
        user_id = result.get("user_id")
        if class_student_ids is not None and user_id not in class_student_ids:
            continue
        activity_map[submitted_at.date().isoformat()].add(user_id)

    if class_student_ids is not None:
        total_students = len(class_student_ids)
    else:
        total_students = await db.users.count_documents({"role": "student"})

    heatmap = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        students_active = len(activity_map.get(day.isoformat(), set()))
        percent_active = round((students_active / total_students) * 100, 1) if total_students else 0
        heatmap.append({
            "date": day.isoformat(),
            "active_students": students_active,
            "percent_active": percent_active
        })

    return {"heatmap": heatmap, "total_students": total_students}

@api_router.get("/teacher/dashboard/actions")
async def get_teacher_dashboard_actions(current_user: dict = Depends(require_role("teacher", "admin"))):
    now = datetime.now(timezone.utc)
    struggling_cutoff = now - timedelta(days=1)
    inactive_cutoff = now - timedelta(days=3)

    recent_results = await db.weekly_quiz_results.find(
        {"submitted_at": {"$gte": struggling_cutoff.isoformat()}},
        {"_id": 0}
    ).to_list(1000)

    struggling_ids = set()
    for result in recent_results:
        total_questions = result.get("total_questions") or 0
        correct_answers = result.get("correct_answers") or 0
        accuracy = (correct_answers / total_questions) if total_questions else 0
        if accuracy < 0.5:
            struggling_ids.add(result["user_id"])

    inactive_students_cursor = db.users.find(
        {
            "role": "student",
            "$or": [
                {"last_login_date": {"$lt": inactive_cutoff.isoformat()}},
                {"last_login_date": {"$exists": False}}
            ]
        },
        {"_id": 0, "id": 1, "username": 1, "last_login_date": 1}
    )
    inactive_students = []
    async for student in inactive_students_cursor:
        inactive_students.append(student)

    struggling_students = []
    if struggling_ids:
        struggling_students = await db.users.find(
            {"id": {"$in": list(struggling_ids)}},
            {"_id": 0, "id": 1, "username": 1}
        ).to_list(len(struggling_ids))

    word_error_aggregate: Dict[str, int] = defaultdict(int)
    students_cursor = db.users.find({"role": "student"}, {"_id": 0, "word_errors": 1})
    async for student in students_cursor:
        for word_id, count in (student.get("word_errors") or {}).items():
            word_error_aggregate[word_id] += count
    
    # Map aggregated word_ids back to word documents
    challenging_words: List[dict] = []
    if word_error_aggregate:
        top_items = sorted(
            word_error_aggregate.items(),
            key=lambda item: item[1],
            reverse=True
        )[:10]
        word_ids = [word_id for word_id, _ in top_items]
        words = await db.words.find({"id": {"$in": word_ids}}, {"_id": 0}).to_list(100)
        word_map = {w["id"]: w for w in words}
        for word_id, count in top_items:
            word = word_map.get(word_id)
            if word:
                challenging_words.append(
                    {
                        "word_id": word_id,
                        "english": word.get("english"),
                        "turkish": word.get("turkish"),
                        "count": count,
                    }
                )

    return {
        "struggling_students": struggling_students,
        "inactive_students": inactive_students,
        "challenging_words": challenging_words
    }

@api_router.post("/teacher/assignments")
async def create_word_assignment(assignment: WordAssignmentCreate, current_user: dict = Depends(require_role("teacher", "admin"))):
    if not assignment.word_ids:
        raise HTTPException(status_code=400, detail="Atanacak kelime seçilmedi")

    assigned_to_name = assignment.assigned_to_id

    if assignment.assigned_to_type == "student":
        target = await db.users.find_one({"id": assignment.assigned_to_id, "role": "student"}, {"_id": 0, "username": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")
        assigned_to_name = target["username"]
    elif assignment.assigned_to_type == "class":
        target_exists = await db.users.count_documents({"role": "student", "class_name": assignment.assigned_to_id})
        if target_exists == 0:
            raise HTTPException(status_code=404, detail="Bu sınıf için öğrenci bulunamadı")
    else:
        raise HTTPException(status_code=400, detail="Geçersiz hedef tipi")

    teacher_name = current_user.get("username", "Öğretmen")
    word_assignment = WordAssignment(
        assigned_by=current_user["id"],
        assigned_by_name=teacher_name,
        assigned_to_id=assignment.assigned_to_id,
        assigned_to_name=assigned_to_name,
        assigned_to_type=assignment.assigned_to_type,
        word_ids=assignment.word_ids,
        due_date=assignment.due_date
    )

    await db.word_assignments.insert_one(word_assignment.model_dump())

    return {"message": "Ödev başarıyla oluşturuldu", "assignment": word_assignment.model_dump()}

@api_router.get("/teacher/assignments")
async def list_word_assignments(current_user: dict = Depends(require_role("teacher", "admin"))):
    assignments = await db.word_assignments.find({"assigned_by": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"assignments": assignments}

# ============= PERSONALIZED LEARNING PLAN =============

@api_router.get("/learning/personalized-plan")
async def get_personalized_learning_plan(current_user: dict = Depends(get_current_user)):
    """Generate personalized learning plan based on user errors"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    word_errors = user.get("word_errors", {})
    
    # word_errors now stores per-word error counts: {word_id: error_count}
    # Find most difficult words for this user
    difficult_word_ids: List[str] = []
    if word_errors:
        sorted_words = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)
        difficult_word_ids = [word_id for word_id, _ in sorted_words[:50]]
    
    study_words: List[str] = []
    weak_categories: List[str] = []
    
    if difficult_word_ids:
        words_cursor = db.words.find({"id": {"$in": difficult_word_ids}}, {"_id": 0})
        words = await words_cursor.to_list(100)
        study_words = [w["id"] for w in words][:12]
        weak_categories = list({w.get("category", "general") for w in words})
    else:
        # If no errors, get random words
        words = await db.words.find({}, {"_id": 0}).to_list(100)
        study_words = random.sample([w["id"] for w in words], min(12, len(words)))
    
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
        "message": (
            f"Sen en çok {', '.join(weak_categories)} kategorilerindeki kelimelerde hata yapıyorsun. "
            f"Bugün {len(study_words)} kelimeyi tekrar edeceksin."
        )
    }


@api_router.get("/learning/review-words")
async def get_review_words(limit: int = 20, current_user: dict = Depends(get_current_user)):
    """
    Get words that are due for spaced repetition review for the current user.
    If the user has no review history yet, fall back to random words.
    """
    today = datetime.now(timezone.utc).date()
    today_iso = today.isoformat()
    
    progress_docs = await db.user_word_progress.find(
        {
            "user_id": current_user["id"],
            "next_review": {"$lte": today_iso}
        },
        {"_id": 0}
    ).to_list(limit)
    
    if not progress_docs:
        # Initialize with random words
        words = await db.words.find({}, {"_id": 0}).to_list(limit * 2)
        random.shuffle(words)
        selected = words[:limit]
        return {"mode": "initial", "words": selected}
    
    word_ids = [p["word_id"] for p in progress_docs]
    words = await db.words.find({"id": {"$in": word_ids}}, {"_id": 0}).to_list(limit * 2)
    word_map = {w["id"]: w for w in words}
    
    due_words = []
    for p in progress_docs:
        word = word_map.get(p["word_id"])
        if word:
            item = dict(word)
            item["srs"] = {
                "interval_days": p.get("interval_days", 1),
                "repetition": p.get("repetition", 0),
                "next_review": p.get("next_review"),
                "last_result": p.get("last_result")
            }
            due_words.append(item)
    
    # Ensure we don't send more than requested
    due_words = due_words[:limit]
    return {"mode": "review", "words": due_words}


def _update_srs(progress: dict, rating: str, today: datetime.date) -> dict:
    """Small helper implementing simplified SM-2 style SRS updates."""
    ease = float(progress.get("ease_factor", 2.5))
    interval = int(progress.get("interval_days", 1))
    repetition = int(progress.get("repetition", 0))
    
    if rating == "again":
        repetition = 0
        interval = 1
        ease = max(1.3, ease - 0.2)
    elif rating == "hard":
        repetition += 1
        interval = max(1, int(interval * 1.2))
        ease = max(1.3, ease - 0.15)
    elif rating == "good":
        repetition += 1
        interval = max(1, int(interval * ease))
    elif rating == "easy":
        repetition += 1
        interval = max(1, int(interval * ease * 1.3))
        ease += 0.15
    
    next_review = (today + timedelta(days=interval)).isoformat()
    
    progress.update(
        {
            "ease_factor": ease,
            "interval_days": interval,
            "repetition": repetition,
            "next_review": next_review,
            "last_result": rating,
        }
    )
    return progress


@api_router.post("/learning/review-result")
async def update_review_result(update: ReviewUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update spaced repetition progress after the user reviews a word.
    """
    today = datetime.now(timezone.utc)
    existing = await db.user_word_progress.find_one(
        {"user_id": current_user["id"], "word_id": update.word_id},
        {"_id": 0}
    )
    
    if not existing:
        progress = UserWordProgress(
            user_id=current_user["id"],
            word_id=update.word_id,
            last_result=update.rating,
        ).model_dump()
    else:
        progress = dict(existing)
    
    progress = _update_srs(progress, update.rating, today.date())
    
    await db.user_word_progress.update_one(
        {"user_id": current_user["id"], "word_id": update.word_id},
        {"$set": progress},
        upsert=True
    )
    
    return {"message": "Review updated", "progress": progress}

class TrackErrorRequest(BaseModel):
    word_id: str

@api_router.post("/games/track-error")
async def track_word_error(request: TrackErrorRequest, current_user: dict = Depends(get_current_user)):
    """Track word error for personalized learning (per word)."""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    word_errors = user.get("word_errors", {}) or {}
    word_id = request.word_id
    word_errors[word_id] = int(word_errors.get(word_id, 0)) + 1
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"word_errors": word_errors}}
    )
    
    return {"message": "Error tracked", "errors": word_errors}


@api_router.get("/learning/hard-words")
async def get_hard_words(limit: int = 5, current_user: dict = Depends(get_current_user)):
    """
    Return the user's most difficult words based on per-word error counts.
    """
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    word_errors = user.get("word_errors", {}) or {}
    if not word_errors:
        return {"words": []}
    
    sorted_items = sorted(word_errors.items(), key=lambda x: x[1], reverse=True)[: limit * 2]
    word_ids = [word_id for word_id, _ in sorted_items]
    
    words = await db.words.find({"id": {"$in": word_ids}}, {"_id": 0}).to_list(limit * 2)
    word_map = {w["id"]: w for w in words}
    
    result = []
    for word_id, count in sorted_items:
        word = word_map.get(word_id)
        if word:
            item = dict(word)
            item["error_count"] = int(count)
            result.append(item)
        if len(result) >= limit:
            break
    
    return {"words": result}

# ============= PRONUNCIATION TEST =============

@api_router.post("/pronunciation/test")
async def pronunciation_test(test_request: PronunciationTestRequest, current_user: dict = Depends(get_current_user)):
    """AI-based pronunciation scoring (0-100)"""
    # In production, this would use speech recognition API (Google Cloud Speech, Azure Speech, etc.)
    # For now, we'll simulate with a random score or use AI
    
    word = await db.words.find_one({"id": test_request.word_id}, {"_id": 0})
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    # If client already did speech recognition, use recognized_text similarity
    base_score = None
    if test_request.recognized_text:
        target = (word.get("english") or "").strip().lower()
        spoken = test_request.recognized_text.strip().lower()
        if target:
            # Very simple similarity: proportion of matching prefix characters
            max_len = max(len(target), len(spoken))
            match_count = 0
            for t_char, s_char in zip(target, spoken):
                if t_char == s_char:
                    match_count += 1
            similarity = match_count / max_len if max_len > 0 else 0.0
            base_score = int(40 + similarity * 60)  # Map to 40-100 aralığı
    
    # Fallback: simulate pronunciation score (0-100)
    # In production: Use speech-to-text API and compare with word pronunciation
    if base_score is None:
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
    
    try:
        # OpenAI API kullan
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            # Fallback story
            story_text = f"Once upon a time, there was a student who learned {request.words_learned_count} words. They used words like {', '.join([w['english'] for w in selected_words[:5]])} in their daily life."
            highlighted_word_ids = [w["id"] for w in selected_words[:5]]
        else:
            client = OpenAI(api_key=openai_key)
            
            prompt = f"""Create a short story (3-4 sentences) for English learners celebrating {request.words_learned_count} words learned. 
            
Include these words naturally: {', '.join([w['english'] for w in selected_words[:5]])}.

Make it encouraging and fun. Write only the story, nothing else."""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an English teacher helping students learn vocabulary through stories."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            story_text = response.choices[0].message.content.strip()
            highlighted_word_ids = [w["id"] for w in selected_words[:5]]
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
        "daily_words_target": user.get("daily_words_target", 5),
        "daily_words_progress": user.get("daily_words_progress", 0),
        "favorites": user.get("favorites", []),
        "achievements": achievements,
        "season_history": user.get("season_history", [])
    }


class DailyTargetUpdate(BaseModel):
    daily_words_target: int


@api_router.put("/user/daily-target")
async def update_daily_target(
    payload: DailyTargetUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's daily words target."""
    if payload.daily_words_target < 1 or payload.daily_words_target > 100:
        raise HTTPException(status_code=400, detail="daily_words_target 1 ile 100 arasında olmalıdır.")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"daily_words_target": payload.daily_words_target}}
    )
    
    return {"message": "Günlük hedef güncellendi", "daily_words_target": payload.daily_words_target}


@api_router.get("/user/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Return user's favorite words."""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorite_ids: List[str] = user.get("favorites", []) or []
    if not favorite_ids:
        return {"favorites": [], "words": []}
    
    words = await db.words.find({"id": {"$in": favorite_ids}}, {"_id": 0}).to_list(len(favorite_ids))
    return {"favorites": favorite_ids, "words": words}


@api_router.post("/user/favorites/toggle")
async def toggle_favorite(
    update: FavoritesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Toggle a word in user's favorites list."""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorites: List[str] = list(user.get("favorites", []) or [])
    if update.word_id in favorites:
        favorites = [wid for wid in favorites if wid != update.word_id]
        action = "removed"
    else:
        favorites.append(update.word_id)
        action = "added"
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"favorites": favorites}}
    )
    
    return {"message": f"Favorite {action}", "favorites": favorites}

# Update game scores to award XP
@api_router.post("/games/scores", response_model=GameScore)
async def create_game_score_with_xp(score_create: GameScoreCreate, current_user: dict = Depends(get_current_user)):
    # Check if user is teacher or admin - don't save scores or update points for them
    user_role = current_user.get("role")
    is_teacher_or_admin = user_role in ["teacher", "admin"]
    
    game_score = GameScore(
        user_id=current_user["id"],
        username=current_user["username"],
        game_type=score_create.game_type,
        score=score_create.score,
        correct_answers=score_create.correct_answers,
        wrong_answers=score_create.wrong_answers,
        completed=score_create.completed
    )
    
    # Only save score to database if user is a student
    if not is_teacher_or_admin:
        await db.game_scores.insert_one(game_score.model_dump())
    
    # Only update user stats with XP if user is a student
    if not is_teacher_or_admin:
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
    try:
        openai_key = os.environ.get('OPENAI_API_KEY')
        if not openai_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env file.")
        
        client = OpenAI(api_key=openai_key)
        
        prompt = f"""You are an English teacher assistant. Extract all important English words from the given text.

Return ONLY a JSON array of words with their Turkish translations.
Format: [{{"english": "word", "turkish": "çeviri", "category": "general"}}]

Extract words from this text:

{request.text}"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an English teacher assistant. Always return valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON
        try:
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