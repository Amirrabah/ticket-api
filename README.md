# Ticket API

REST API for ticket management, built with FastAPI and PostgreSQL. Supports user registration, JWT authentication and role-based access control.

**Live demo:** https://ticket-api-production-91ed.up.railway.app/docs

## Tech stack

- **FastAPI** — API framework, automatic OpenAPI docs
- **PostgreSQL** — database
- **SQLAlchemy** — ORM
- **Alembic** — database migrations
- **bcrypt** — password hashing
- **python-jose** — JWT tokens
- **Railway** — hosting

## Features

- User registration with hashed passwords
- JWT-based authentication
- Role-based permissions (user / support / admin)
- Tickets owned by their creator
- Users see only their own tickets; support and admin see all
- Only admins can delete

## Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/register` | Create an account | No |
| POST | `/login` | Get a JWT token | No |
| GET | `/tickets` | List tickets | Yes |
| GET | `/tickets/{id}` | Get one ticket | Yes |
| POST | `/tickets` | Create a ticket | Yes |
| PATCH | `/tickets/{id}` | Close a ticket | Yes |
| DELETE | `/tickets/{id}` | Delete a ticket | Admin |

## Running locally

```bash
git clone https://github.com/Amirrabah/ticket-api.git
cd ticket-api

python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

cp .env.example .env          # then fill in your values
alembic upgrade head
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs

## Security notes

- Passwords hashed with bcrypt (salted, cost factor 12)
- All queries parameterised — no SQL injection surface
- Secrets held in environment variables, never committed
- Login returns a generic error to prevent user enumeration
- Requests for other users' tickets return 404 rather than 403, to avoid revealing which IDs exist