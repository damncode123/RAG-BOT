from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from db.connection import get_connection
from passlib.context import CryptContext
import jwt
import datetime
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Secret key for JWT (set this securely in production)
SECRET_KEY = os.environ.get("JWT_SECRET", "JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Request models
class UserRegister(BaseModel):
    email: str
    password: str

# Helper: create JWT token
def create_access_token(data: dict, expires_delta: int = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_delta or ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Helper: verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Helper: hash password
def get_password_hash(password):
    return pwd_context.hash(password)

# Register endpoint
@router.post("/auth/register")
def register(user_data: UserRegister):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    # Check if user exists
    cur.execute("SELECT * FROM users WHERE email = %s", (user_data.email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    # Hash password and insert user
    hashed_password = get_password_hash(user_data.password)
    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s)",
        (user_data.email, hashed_password)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "User registered successfully"}

# Login endpoint (returns JWT token)
@router.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE email = %s", (form_data.username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    # Create JWT token
    token_data = {"sub": str(user["id"]), "email": user["email"]}
    access_token = create_access_token(token_data)
    return {"access_token": access_token, "token_type": "bearer"}

# Dependency: get current user from JWT token
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    # Fetch user from DB
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user 