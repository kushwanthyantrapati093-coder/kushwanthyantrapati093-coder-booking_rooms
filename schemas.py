from pydantic import BaseModel
from datetime import datetime

# ✅ User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True

# ✅ Room Schemas
class RoomBase(BaseModel):
    name: str

class RoomCreate(RoomBase):
    pass

class RoomOut(RoomBase):
    id: int

    class Config:
        from_attributes = True

# ✅ Booking Schemas
class BookingBase(BaseModel):
    room_id: int
    booked_by: str
    start_time: datetime
    end_time: datetime

class BookingCreate(BaseModel):
    room_id: int
    booked_by: str
    start_time: datetime
    end_time: datetime

class BookingOut(BookingCreate):
    id: int
    class Config:
        from_attributes = True