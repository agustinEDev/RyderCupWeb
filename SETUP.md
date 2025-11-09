# 🚀 Setup Guide - Ryder Cup Manager

Guía completa para configurar el entorno de desarrollo local con Backend + Frontend.

---

## 📋 Prerequisitos

Asegúrate de tener instalado:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.12+ ([Download](https://www.python.org/downloads/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))
- **Docker** (opcional, para backend) ([Download](https://www.docker.com/))

Verificar instalación:
```bash
node --version    # v18.x.x o superior
npm --version     # 9.x.x o superior
python --version  # Python 3.12.x
psql --version    # PostgreSQL 15.x
git --version     # git version 2.x.x
```

---

## 🏗️ Arquitectura de Repositorios

El proyecto está dividido en **dos repositorios separados**:

```
Documents/
├── RyderCupAm/          # Backend API (Python + FastAPI)
└── RyderCupWeb/         # Frontend Web (React + Vite)
```

Ambos deben estar clonados para desarrollo completo.

---

## 1️⃣ Setup Backend (RyderCupAm)

### Clonar Repositorio
```bash
cd ~/Documents
git clone https://github.com/agustinEDev/RyderCupAm.git
cd RyderCupAm
```

### Opción A: Con Docker (Recomendado)

```bash
# 1. Iniciar servicios (PostgreSQL + App)
docker-compose up -d

# 2. Aplicar migraciones
docker-compose exec app alembic upgrade head

# 3. Verificar que esté funcionando
curl http://localhost:8000/docs

# 4. Ver logs si hay problemas
docker-compose logs -f app
```

### Opción B: Sin Docker (Local)

```bash
# 1. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar base de datos
# Editar .env con tus credenciales de PostgreSQL
cp .env.example .env

# 4. Aplicar migraciones
alembic upgrade head

# 5. Correr aplicación
uvicorn main:app --reload

# 6. Verificar
open http://localhost:8000/docs
```

### Variables de Entorno Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/rydercup
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Verificar Backend Funcional
```bash
# Health check
curl http://localhost:8000/health

# Swagger docs
open http://localhost:8000/docs

# Run tests
python dev_tests.py
```

✅ **Backend OK** si ves la documentación Swagger en el navegador.

---

## 2️⃣ Setup Frontend (RyderCupWeb)

### Clonar Repositorio
```bash
cd ~/Documents
git clone https://github.com/agustinEDev/RyderCupWeb.git
cd RyderCupWeb
```

### Instalar Dependencias

**Opción 1: Si el proyecto React ya está inicializado**
```bash
npm install
```

**Opción 2: Si necesitas crear el proyecto desde cero**
```bash
# Crear proyecto con Vite
npm create vite@latest . -- --template react

# Instalar dependencias base
npm install

# Instalar dependencias adicionales
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Configurar Variables de Entorno
```bash
# Copiar ejemplo
cp .env.example .env

# Editar .env
# VITE_API_BASE_URL=http://localhost:8000
```

### Ejecutar Desarrollo
```bash
npm run dev
```

Abre el navegador en: `http://localhost:5173`

### Verificar Frontend Funcional
- ✅ Landing page se carga
- ✅ Botones de Login/Register visibles
- ✅ Puedes navegar a `/login` y `/register`
- ✅ Console sin errores de CORS (si backend está corriendo)

---

## 3️⃣ Desarrollo Completo (Backend + Frontend)

### Terminal 1: Backend
```bash
cd ~/Documents/RyderCupAm

# Con Docker
docker-compose up

# O sin Docker
source .venv/bin/activate
uvicorn main:app --reload
```

### Terminal 2: Frontend
```bash
cd ~/Documents/RyderCupWeb
npm run dev
```

### URLs de Desarrollo
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

### Frontend Tests (cuando estén implementados)
```bash
cd ~/Documents/RyderCupWeb
npm run test
```

---

## 🔄 Workflow de Desarrollo Típico

### 1. Iniciar día de trabajo
```bash
# Terminal 1: Backend
cd ~/Documents/RyderCupAm
docker-compose up -d  # o uvicorn main:app --reload

# Terminal 2: Frontend
cd ~/Documents/RyderCupWeb
npm run dev
```

### 2. Hacer cambios
- **Backend**: Editar en `RyderCupAm/src/`
  - FastAPI recarga automáticamente
  - Tests: `python dev_tests.py`

- **Frontend**: Editar en `RyderCupWeb/src/`
  - Vite recarga automáticamente
  - Ver cambios inmediatamente en navegador

### 3. Probar integración
1. Hacer registro de usuario en frontend
2. Verificar que se crea en backend
3. Login y ver token JWT
4. Navegar por la aplicación

### 4. Commits
```bash
# Backend
cd ~/Documents/RyderCupAm
git add .
git commit -m "feat: descripción del cambio"
git push origin main

# Frontend
cd ~/Documents/RyderCupWeb
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Verificar PostgreSQL
docker-compose ps  # Con Docker
psql -U postgres   # Sin Docker

# Ver logs
docker-compose logs -f app

# Recrear base de datos
docker-compose down -v
docker-compose up -d
alembic upgrade head
```

### Frontend no conecta con Backend
```bash
# 1. Verificar backend corriendo
curl http://localhost:8000/health

# 2. Verificar .env del frontend
cat .env
# Debe tener: VITE_API_BASE_URL=http://localhost:8000

# 3. Revisar CORS en backend
# Ver main.py, debe permitir http://localhost:5173
```

### CORS Errors
Si ves errores de CORS en consola del navegador:

**Backend**: Verificar en `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ← Agregar si falta
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

## 📚 Próximos Pasos

Una vez que tengas todo funcionando:

1. **Leer documentación**:
   - Backend: `RyderCupAm/CLAUDE.md`
   - Frontend: `RyderCupWeb/CLAUDE.md`
   - Design: `RyderCupWeb/STITCH_PROMPT.md`

2. **Explorar código**:
   - Backend: Arquitectura Clean Architecture en `src/modules/`
   - Frontend: Componentes en `src/components/`

3. **Implementar features**:
   - Ver `STITCH_PROMPT.md` para diseño completo
   - Seguir convenciones de cada repo

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Backend
cd ~/Documents/RyderCupAm
docker-compose up -d               # Iniciar
docker-compose logs -f app         # Ver logs
docker-compose down                # Detener
python dev_tests.py                # Tests
alembic upgrade head               # Migrations

# Frontend
cd ~/Documents/RyderCupWeb
npm run dev                        # Desarrollo
npm run build                      # Producción
npm run preview                    # Preview build
npm run lint                       # Linter

# Ambos
git status                         # Ver cambios
git add .                          # Añadir cambios
git commit -m "mensaje"            # Commit
git push origin main               # Push
```

---

## ✅ Checklist de Setup Completo

- [ ] Node.js 18+ instalado
- [ ] Python 3.12+ instalado
- [ ] PostgreSQL 15+ instalado (o Docker)
- [ ] Git configurado
- [ ] Backend clonado en `~/Documents/RyderCupAm`
- [ ] Frontend clonado en `~/Documents/RyderCupWeb`
- [ ] Backend corriendo en `http://localhost:8000`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Swagger docs accesibles
- [ ] Landing page del frontend cargando
- [ ] Sin errores de CORS
- [ ] Backend tests pasando (360 tests)

---

¡Todo listo para desarrollar! 🚀⛳
