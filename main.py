from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from auth import get_db, create_access_token, get_current_user
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
import models, schemas
from database import engine
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
from fastapi.responses import HTMLResponse



app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


models.Base.metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- User Registration ---
@app.post("/register", response_model=schemas.UserOut, tags=["Users"], status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(username=user.username, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- Login & Token ---
@app.post("/token", tags=["Authorization"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

# --- Create Room ---
@app.post("/rooms/", response_model=schemas.RoomOut, tags=["Rooms"], status_code=status.HTTP_201_CREATED)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if db.query(models.Room).filter(models.Room.name == room.name).first():
        raise HTTPException(status_code=400, detail="Room already exists")
    db_room = models.Room(name=room.name)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

# --- Create Booking ---
@app.post("/bookings/", response_model=schemas.BookingOut, tags=["Bookings"], status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemas.BookingCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if booking.start_time >= booking.end_time:
        raise HTTPException(status_code=400, detail="Invalid time range")
    
    conflict = db.query(models.Booking).filter(
        models.Booking.room_id == booking.room_id,
        models.Booking.start_time < booking.end_time,
        models.Booking.end_time > booking.start_time
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Room already booked")

    new_booking = models.Booking(
        room_id=booking.room_id,
        user_id=current_user.id,
        booked_by=booking.booked_by,  # ✅ Save booked_by
        start_time=booking.start_time,
        end_time=booking.end_time
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


# --- List Bookings (User Specific) ---
@app.get("/bookings/", response_model=list[schemas.BookingOut], tags=["Bookings"])
def list_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Booking).filter(models.Booking.user_id == current_user.id).all()

# --- Update Booking ---
@app.put("/bookings/{booking_id}", response_model=schemas.BookingOut, tags=["Bookings"])
def update_booking(
    booking_id: int,
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.user_id == current_user.id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.start_time >= booking.end_time:
        raise HTTPException(status_code=400, detail="Invalid time range")

    conflict = db.query(models.Booking).filter(
        models.Booking.room_id == booking.room_id,
        models.Booking.start_time < booking.end_time,
        models.Booking.end_time > booking.start_time,
        models.Booking.id != booking_id
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Room already booked in that time")

    for key, value in booking.dict().items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing

# --- Delete Booking ---
@app.delete("/bookings/{booking_id}", tags=["Bookings"], status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id,
        models.Booking.user_id == current_user.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(booking)
    db.commit()
    return