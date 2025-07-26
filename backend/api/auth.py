# Importing necessary modules
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from db.connection import get_connection  # Custom function to get DB connection
from passlib.context import CryptContext  # For password hashing
import jwt  # For creating and verifying JWT tokens
import datetime  # For managing token expiry
import os  # To access environment variables

# Create a new API router instance
router = APIRouter()

# OAuth2 scheme to extract token from request header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Create a context for hashing and verifying passwords using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT secret and algorithm config
SECRET_KEY = os.environ.get("JWT_SECRET", "JWT_SECRET")  # Fallback value for development
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Token valid for 7 days

# Pydantic model for user registration input
class UserRegister(BaseModel):
    email: str
    password: str

# Helper function to create JWT token
def create_access_token(data: dict, expires_delta: int = None):
    to_encode = data.copy()  # Copy the user data
    # Set token expiration
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_delta or ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})  # Add expiration to payload
    # Encode using secret key and algorithm
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Helper function to verify password with hashed value
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Helper function to hash password
def get_password_hash(password):
    return pwd_context.hash(password)

# User registration endpoint
@router.post("/auth/register")
def register(user_data: UserRegister):
    conn = get_connection()  # Get DB connection
    cur = conn.cursor(dictionary=True)
    
    # Check if user already exists
    cur.execute("SELECT * FROM users WHERE email = %s", (user_data.email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password before storing
    hashed_password = get_password_hash(user_data.password)
    
    # Insert new user into the database
    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s)",
        (user_data.email, hashed_password)
    )
    
    conn.commit()  # Commit changes
    cur.close()
    conn.close()
    
    return {"message": "User registered successfully"}  # Success response

# Login endpoint to authenticate user and return JWT token
@router.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_connection()  # Get DB connection
    cur = conn.cursor(dictionary=True)
    
    # Fetch user by email (username is used for email in OAuth2PasswordRequestForm)
    cur.execute("SELECT * FROM users WHERE email = %s", (form_data.username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    # Check if user exists and password is correct
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Prepare payload and generate token
    token_data = {"sub": str(user["id"]), "email": user["email"]}
    access_token = create_access_token(token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}  # Return token

# Dependency to extract and validate the current user from JWT token
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        # Decode the token using secret and algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # Extract user ID
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Fetch the user from the database
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    # If user not found, raise error
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user  # Return authenticated user info
