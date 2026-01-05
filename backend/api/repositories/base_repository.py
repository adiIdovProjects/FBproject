from sqlalchemy.orm import Session

class BaseRepository:
    """Base repository class for handling database sessions."""
    
    def __init__(self, db: Session):
        self.db = db
