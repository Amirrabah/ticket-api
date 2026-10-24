from enum import Enum

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from models import Ticket, User
from auth import hash_password, verify_password, create_access_token
from dependencies import get_current_user


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rabah-servicedesk.netlify.app",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Only these values are accepted. Anything else gets a 422.
class Priority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"


class Status(str, Enum):
    open = "open"
    closed = "closed"


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    priority: Priority


class TicketUpdate(BaseModel):
    status: Status


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: str
    password: str


@app.get("/tickets")
def get_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Ticket)

    if current_user.role == "user":
        query = query.filter(Ticket.user_id == current_user.id)

    return query.order_by(Ticket.id).all()


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == "user" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ticket


@app.post("/tickets")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_ticket = Ticket(
        title=ticket.title,
        priority=ticket.priority.value,
        user_id=current_user.id
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@app.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, update: TicketUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == "user" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = update.status.value
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db.delete(ticket)
    db.commit()
    return {"message": f"Ticket {ticket_id} deleted"}


@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "name": new_user.name, "email": new_user.email}


@app.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id, user.role)
    return {"access_token": token, "token_type": "bearer"}