import sys
import os

# Set up path to include project root
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

from backend.config.base_config import settings
from jose import jwt

# Token from user logs
state_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNSwidHlwZSI6ImNvbm5lY3QiLCJub25jZSI6ImE2ODg5Y2FkLWY3ODktNGE2Mi05M2U1LWExMzg3NjE2YWQ5NiJ9.08HYdW_3memdTEdsRctDQU_lhFuN3jDvWufXOrpNf8k"

print(f"DEBUG: Using Secret Key: {settings.JWT_SECRET_KEY}")
print(f"DEBUG: Using Algorithm: {settings.ALGORITHM}")

try:
    decoded = jwt.decode(state_token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
    print(f"SUCCESS: Decoded payload: {decoded}")
except Exception as e:
    print(f"ERROR: Decoding failed: {e}")
    # Try with raw library defaults to investigate
    try:
        header = jwt.get_unverified_header(state_token)
        print(f"INFO: Unverified Header: {header}")
        claims = jwt.get_unverified_claims(state_token)
        print(f"INFO: Unverified Claims: {claims}")
    except Exception as e2:
        print(f"CRITICAL: Token is malformed: {e2}")
