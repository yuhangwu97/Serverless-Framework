import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

security = HTTPBearer()

class TokenData(BaseModel):
    user_id: str = None
    username: str = None

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    
    try:
        jwt_secret = os.getenv("JWT_SECRET", "jwt-secret")
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        
        user_id: str = payload.get("userId")
        username: str = payload.get("username")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return TokenData(user_id=user_id, username=username)
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")