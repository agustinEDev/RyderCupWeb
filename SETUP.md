# 🚀 Setup Guide - Ryder Cup Manager

Complete guide to configure local development environment with Backend + Frontend.

---

## 📋 Prerequisites

Make sure you have installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.12+ ([Download](https://www.python.org/downloads/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))
- **Docker** (opcional, para backend) ([Download](https://www.docker.com/))

Verify installation:
```bash
node --version    # v18.x.x or higher
npm --version     # 9.x.x or higher
python --version  # Python 3.12.x
psql --version    # PostgreSQL 15.x
git --version     # git version 2.x.x
```

---

## 🏗️ Repository Architecture

The project is divided into **two separate repositories**:

```
Documents/
├── RyderCupAm/          # Backend API (Python + FastAPI)
└── RyderCupWeb/         # Frontend Web (React + Vite)
```

Both must be cloned for complete development.

---

## 1️⃣ Setup Backend (RyderCupAm)

### Clone Repository
```bash
cd ~/Documents
git clone https://github.com/agustinEDev/RyderCupAm.git
cd RyderCupAm
```

### Option A: With Docker (Recommended)

```bash
# 1. Start services (PostgreSQL + App)
docker-compose up -d

# 2. Apply migrations
docker-compose exec app alembic upgrade head

# 3. Verify it's working
curl http://localhost:8000/docs

# 4. View logs if there are issues
docker-compose logs -f app
```

### Option B: Without Docker (Local)

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure database
# Edit .env with your PostgreSQL credentials
cp .env.example .env

# 4. Apply migrations
alembic upgrade head

# 5. Run application
uvicorn main:app --reload

# 6. Verify
open http://localhost:8000/docs
```

### Backend Environment Variables (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/rydercup
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Verify Backend is Working
```bash
# Health check
curl http://localhost:8000/health

# Swagger docs
open http://localhost:8000/docs

# Run tests
python dev_tests.py
```

✅ **Backend OK** if you see Swagger documentation in the browser.

---

## 2️⃣ Setup Frontend (RyderCupWeb)

### Clone Repository
```bash
cd ~/Documents
git clone https://github.com/agustinEDev/RyderCupWeb.git
cd RyderCupWeb
```

### Install Dependencies

**Option 1: If React project is already initialized**
```bash
npm install
```

**Option 2: If you need to create the project from scratch**
```bash
# Create project with Vite
npm create vite@latest . -- --template react

# Install base dependencies
npm install

# Install additional dependencies
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Configure Environment Variables
```bash
# Copy example
cp .env.example .env

# Edit .env
# VITE_API_BASE_URL=http://localhost:8000
```

### Run Development
```bash
npm run dev
```

Open browser at: `http://localhost:5173`

### Verify Frontend is Working
- ✅ Landing page loads
- ✅ Login/Register buttons visible
- ✅ You can navigate to `/login` and `/register`
- ✅ Console without CORS errors (if backend is running)

---

## 3️⃣ Complete Development (Backend + Frontend)

### Terminal 1: Backend
```bash
cd ~/Documents/RyderCupAm

# With Docker
docker-compose up

# Or without Docker
source .venv/bin/activate
uvicorn main:app --reload
```

### Terminal 2: Frontend
```bash
cd ~/Documents/RyderCupWeb
npm run dev
```

### Development URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🧪 Testing

### Backend Tests
```bash
cd ~/Documents/RyderCupAm
python dev_tests.py          # 360 tests, ~12s
```

### Frontend Tests (when implemented)
```bash
cd ~/Documents/RyderCupWeb
npm run test
```

---

## 🔄 Typical Development Workflow

### 1. Start work day
```bash
# Terminal 1: Backend
cd ~/Documents/RyderCupAm
docker-compose up -d  # or uvicorn main:app --reload

# Terminal 2: Frontend
cd ~/Documents/RyderCupWeb
npm run dev
```

### 2. Make changes
- **Backend**: Edit in `RyderCupAm/src/`
  - FastAPI reloads automatically
  - Tests: `python dev_tests.py`

- **Frontend**: Edit in `RyderCupWeb/src/`
  - Vite reloads automatically
  - See changes immediately in browser

### 3. Test integration
1. Register user in frontend
2. Verify it's created in backend
3. Login and see JWT token
4. Navigate through application

### 4. Commits
```bash
# Backend
cd ~/Documents/RyderCupAm
git add .
git commit -m "feat: change description"
git push origin main

# Frontend
cd ~/Documents/RyderCupWeb
git add .
git commit -m "feat: change description"
git push origin main
```

---

## 🐛 Troubleshooting

### Backend doesn't start
```bash
# Verify PostgreSQL
docker-compose ps  # With Docker
psql -U postgres   # Without Docker

# View logs
docker-compose logs -f app

# Recreate database
docker-compose down -v
docker-compose up -d
alembic upgrade head
```

### Frontend doesn't connect with Backend
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Verify frontend .env
cat .env
# Must have: VITE_API_BASE_URL=http://localhost:8000

# 3. Review CORS in backend
# See main.py, must allow http://localhost:5173
```

### CORS Errors
If you see CORS errors in browser console:

**Backend**: Verify in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ← Add if missing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Port Already in Use
```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9

# Frontend (5173)
lsof -ti:5173 | xargs kill -9
```

---

## 📚 Next Steps

Once you have everything working:

1. **Read documentation**:
   - Backend: `RyderCupAm/CLAUDE.md`
   - Frontend: `RyderCupWeb/CLAUDE.md`
   - Design: `RyderCupWeb/STITCH_PROMPT.md`

2. **Explore code**:
   - Backend: Clean Architecture in `src/modules/`
   - Frontend: Components in `src/components/`

3. **Implement features**:
   - See `STITCH_PROMPT.md` for complete design
   - Follow conventions of each repo

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Backend
cd ~/Documents/RyderCupAm
docker-compose up -d               # Start
docker-compose logs -f app         # View logs
docker-compose down                # Stop
python dev_tests.py                # Tests
alembic upgrade head               # Migrations

# Frontend
cd ~/Documents/RyderCupWeb
npm run dev                        # Development
npm run build                      # Production
npm run preview                    # Preview build
npm run lint                       # Linter

# Both
git status                         # View changes
git add .                          # Add changes
git commit -m "message"            # Commit
git push origin main               # Push
```

---

## ✅ Complete Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.12+ installed
- [ ] PostgreSQL 15+ installed (or Docker)
- [ ] Git configured
- [ ] Backend cloned in `~/Documents/RyderCupAm`
- [ ] Frontend cloned in `~/Documents/RyderCupWeb`
- [ ] Backend running at `http://localhost:8000`
- [ ] Frontend running at `http://localhost:5173`
- [ ] Swagger docs accessible
- [ ] Frontend landing page loading
- [ ] No CORS errors
- [ ] Backend tests passing (360 tests)

---

All set to develop! 🚀⛳
