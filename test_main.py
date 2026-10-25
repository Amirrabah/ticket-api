import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from db import Base, get_db
from models import User


# A temporary in-memory database, only for tests
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


# Swap the real database for the test database
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    # Empty tables before each test, removed afterwards
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


# ---------- Helpers ----------

def register(email="ameer@test.com", password="secret123", name="Ameer"):
    return client.post("/register", json={"name": name, "email": email, "password": password})


def login(email="ameer@test.com", password="secret123"):
    response = client.post("/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def auth(token):
    return {"Authorization": "Bearer " + token}


def make_admin(email):
    # Promote a user to admin directly in the test database
    db = TestingSession()
    user = db.query(User).filter(User.email == email).first()
    user.role = "admin"
    db.commit()
    db.close()


def create_ticket(token, title="Printer broken", priority="high"):
    return client.post("/tickets", json={"title": title, "priority": priority}, headers=auth(token))


# ---------- Registration and login ----------

def test_register():
    response = register()
    assert response.status_code == 200
    assert response.json()["email"] == "ameer@test.com"
    assert "hashed_password" not in response.json()


def test_register_duplicate_email():
    register()
    response = register()
    assert response.status_code == 400


def test_register_short_password():
    response = register(password="abc")
    assert response.status_code == 422


def test_login_wrong_password():
    register()
    response = client.post("/login", json={"email": "ameer@test.com", "password": "wrongpass1"})
    assert response.status_code == 401


# ---------- Tickets ----------

def test_tickets_require_login():
    response = client.get("/tickets")
    assert response.status_code == 401


def test_create_and_list_ticket():
    register()
    token = login()
    create_ticket(token)

    response = client.get("/tickets", headers=auth(token))
    tickets = response.json()

    assert response.status_code == 200
    assert len(tickets) == 1
    assert tickets[0]["title"] == "Printer broken"
    assert tickets[0]["status"] == "open"
    assert tickets[0]["created_by"] == "Ameer"


def test_close_and_reopen():
    register()
    token = login()
    ticket_id = create_ticket(token).json()["id"]

    closed = client.patch(f"/tickets/{ticket_id}", json={"status": "closed"}, headers=auth(token))
    assert closed.json()["status"] == "closed"

    reopened = client.patch(f"/tickets/{ticket_id}", json={"status": "open"}, headers=auth(token))
    assert reopened.json()["status"] == "open"


# ---------- Security ----------

def test_invalid_priority_rejected():
    # Regression test for the XSS fix
    register()
    token = login()
    response = create_ticket(token, priority='x"><img src=x onerror=alert(1)>')
    assert response.status_code == 422


def test_invalid_status_rejected():
    register()
    token = login()
    ticket_id = create_ticket(token).json()["id"]
    response = client.patch(f"/tickets/{ticket_id}", json={"status": "hacked"}, headers=auth(token))
    assert response.status_code == 422


def test_user_cannot_see_other_users_ticket():
    register(email="a@test.com", name="A")
    register(email="b@test.com", name="B")
    token_a = login(email="a@test.com")
    token_b = login(email="b@test.com")

    ticket_id = create_ticket(token_a).json()["id"]

    # B does not see A's ticket in the list
    assert client.get("/tickets", headers=auth(token_b)).json() == []
    # and gets 404, not 403, when asking for it directly
    assert client.get(f"/tickets/{ticket_id}", headers=auth(token_b)).status_code == 404


def test_user_cannot_delete():
    register()
    token = login()
    ticket_id = create_ticket(token).json()["id"]
    response = client.delete(f"/tickets/{ticket_id}", headers=auth(token))
    assert response.status_code == 403


def test_admin_can_delete():
    register()
    make_admin("ameer@test.com")
    token = login()
    ticket_id = create_ticket(token).json()["id"]
    response = client.delete(f"/tickets/{ticket_id}", headers=auth(token))
    assert response.status_code == 200