# Service Desk — Ticket API

![Tests](https://github.com/Amirrabah/ticket-api/actions/workflows/test.yml/badge.svg)

A full-stack IT ticket system. Users report problems and track them; admins see and manage every ticket. Built with FastAPI and PostgreSQL, with JWT authentication and role-based access control.

**Live app:** https://rabah-servicedesk.netlify.app

**Demo login:** demo@example.com / demo12345

**API docs:** https://ticket-api-production-91ed.up.railway.app/docs

## Tech stack

- **FastAPI** — API framework, automatic OpenAPI docs
- **PostgreSQL** — database
- **SQLAlchemy** — ORM
- **Alembic** — database migrations
- **bcrypt** — password hashing
- **python-jose** — JWT tokens
- **slowapi** — rate limiting
- **HTML, CSS, JavaScript** — frontend
- **Docker** and **Docker Compose** — containers
- **GitHub Actions** — CI
- **Railway** (backend) and **Netlify** (frontend) — hosting

## Features

- User registration with hashed passwords
- JWT-based authentication
- Role-based permissions (user / support / admin)
- Tickets owned by their creator, with the creator's name shown
- Users see only their own tickets; support and admin see all
- Tickets can be closed and reopened
- Only admins can delete

## Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/register` | Create an account | No |
| POST | `/login` | Get a JWT token (max 5 attempts per minute) | No |
| GET | `/tickets` | List tickets | Yes |
| GET | `/tickets/{id}` | Get one ticket | Yes |
| POST | `/tickets` | Create a ticket | Yes |
| PATCH | `/tickets/{id}` | Update ticket status (open / closed) | Yes |
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

## Running with Docker

Runs the API and a PostgreSQL database together. Requires Docker Desktop.

```bash
cp .env.example .env          # then set SECRET_KEY
docker compose up --build
```

Open http://127.0.0.1:8000/docs

The API waits for the database healthcheck, runs the Alembic migrations, then starts. Database data is kept in a Docker volume between restarts. Production on Railway is built from the same Dockerfile.

## Tests

13 automated tests with pytest, run against a temporary in-memory database so the real data is never touched. GitHub Actions runs them on every push.

```bash
pip install pytest httpx
pytest test_main.py -v
```

They cover registration and login, the token requirement, the ticket flow, ownership rules (404 for other users' tickets), admin-only delete, the login rate limit, and a regression test for the XSS fix.

## Security notes

- Passwords hashed with bcrypt (salted, cost factor 12)
- All queries parameterised — no SQL injection surface
- Secrets held in environment variables, never committed or baked into the Docker image
- Login returns a generic error message
- Login rate-limited to 5 attempts per minute per IP
- Requests for other users' tickets return 404 rather than 403, to avoid revealing which IDs exist
- Priority and status are validated as enums on the server; the frontend escapes every rendered field
- A stored XSS path through those fields was found during a self-review and fixed
- CORS restricted to the frontend's domain