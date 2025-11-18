# 📋 Frontend-Backend Integration Spec: Competition Module

> Especificación técnica de lo implementado en el frontend y requisitos para el backend API

**Fecha:** 18 de Noviembre de 2025
**Versión Frontend:** 1.0.0 (Competition Module)
**Branch:** `claude/adapt-frontend-competitions-01HrXTbj77c5WWJnsGGh31gn`

---

## 📦 Resumen de Implementación Frontend

El frontend ha implementado **completamente** la interfaz de usuario para el módulo Competition, incluyendo:

- ✅ Servicios API para todas las operaciones CRUD
- ✅ Página de listado de competiciones con filtros y búsqueda
- ✅ Formulario completo de creación de competiciones
- ✅ Página de detalle con gestión de estados
- ✅ Sistema de inscripciones (enrollments)
- ✅ Validaciones alineadas con los DTOs del backend

**Archivos clave:**
- `src/services/api.js` - Cliente HTTP base
- `src/services/competitions.js` - Servicio de competiciones
- `src/pages/Competitions.jsx` - Listado
- `src/pages/CreateCompetition.jsx` - Formulario creación
- `src/pages/CompetitionDetail.jsx` - Detalle y gestión

---

## 🔐 Autenticación

**Método:** JWT Bearer Token
**Header requerido:**
```
Authorization: Bearer <token>
```

El frontend obtiene el token del endpoint `/api/v1/auth/login` y lo envía automáticamente en todas las peticiones protegidas.

**Manejo de errores de autenticación:**
- Si el backend responde con **401 Unauthorized**, el frontend automáticamente:
  1. Limpia el sessionStorage
  2. Redirige al usuario a `/login`
  3. Muestra mensaje: "Session expired. Please login again."

---

## 🌐 Base URL

```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

**Variable de entorno esperada:**
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📡 Endpoints Requeridos

### **1. Competition CRUD**

#### **1.1 Create Competition**

**Endpoint:** `POST /api/v1/competitions`
**Auth:** Required (JWT)
**Descripción:** Crea una nueva competición en estado DRAFT

**Request Body:**
```json
{
  "name": "Europe vs USA 2025",
  "start_date": "2025-06-15",
  "end_date": "2025-06-17",
  "country_code": "ES",
  "secondary_country_code": "FR",  // OPCIONAL
  "tertiary_country_code": "IT",   // OPCIONAL
  "max_players": 24,                // OPCIONAL (null = unlimited)
  "handicap_type": "PERCENTAGE",    // SCRATCH | PERCENTAGE
  "handicap_percentage": 90.0,      // REQUIRED if handicap_type=PERCENTAGE (100, 95, or 90)
  "team_assignment": "MANUAL"       // MANUAL | AUTOMATIC
}
```

**Validaciones Frontend:**
- `name`: 3-100 caracteres, requerido
- `start_date`: fecha futura, requerido
- `end_date`: >= start_date, requerido
- `country_code`: 2 caracteres uppercase, requerido (seleccionado de dropdown)
- `secondary_country_code`: 2 caracteres uppercase, opcional (solo países adyacentes al primario)
- `tertiary_country_code`: 2 caracteres uppercase, opcional (solo países adyacentes a ambos)
- `max_players`: >= 2, opcional
- `handicap_type`: enum (SCRATCH | PERCENTAGE), requerido
- `handicap_percentage`: 100, 95, or 90, requerido solo si handicap_type=PERCENTAGE
- `team_assignment`: enum (MANUAL | AUTOMATIC), requerido

**Notas importantes:**
- Los códigos de país se seleccionan desde dropdowns con nombres completos, pero se envían como códigos ISO de 2 letras
- El frontend valida que los países secundario y terciario sean adyacentes al primario
- Si handicap_type es SCRATCH, NO se envía handicap_percentage

**Response esperada (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Europe vs USA 2025",
  "start_date": "2025-06-15",
  "end_date": "2025-06-17",
  "country_code": "ES",
  "secondary_country_code": "FR",
  "tertiary_country_code": "IT",
  "location": "Spain, France, Italy",
  "max_players": 24,
  "handicap_type": "PERCENTAGE",
  "handicap_percentage": 90.0,
  "team_assignment": "MANUAL",
  "status": "DRAFT",
  "creator_id": "user-uuid",
  "enrolled_count": 0,
  "is_creator": true,
  "created_at": "2025-11-18T10:00:00Z",
  "updated_at": "2025-11-18T10:00:00Z"
}
```

**Errores esperados:**
- `400 Bad Request`: Validación fallida (ej: países no adyacentes, fechas inválidas)
- `401 Unauthorized`: Token inválido o expirado
- `409 Conflict`: Competición con mismo nombre ya existe para este usuario

---

#### **1.2 List Competitions**

**Endpoint:** `GET /api/v1/competitions`
**Auth:** Required (JWT)
**Descripción:** Lista todas las competiciones (creadas + inscritas)

**Query Parameters (todos opcionales):**
```
?status=ACTIVE           // Filtrar por estado
?creator_id=uuid         // Solo competiciones creadas por usuario
?enrolled_user_id=uuid   // Solo competiciones donde el usuario está inscrito
```

**Response esperada (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Competition Name",
    "start_date": "2025-06-15",
    "end_date": "2025-06-17",
    "location": "Spain, France",
    "max_players": 24,
    "status": "ACTIVE",
    "creator_id": "uuid",
    "enrolled_count": 12,
    "is_creator": true,
    "created_at": "2025-11-18T10:00:00Z"
  }
  // ... más competiciones
]
```

**Campos esperados:**
- `is_creator`: boolean (true si el usuario autenticado es el creador)
- `enrolled_count`: número de jugadores con status APPROVED
- `location`: string formateado con nombres de países

---

#### **1.3 Get Competition by ID**

**Endpoint:** `GET /api/v1/competitions/{competition_id}`
**Auth:** Required (JWT)
**Descripción:** Obtiene detalle completo de una competición

**Response esperada (200 OK):**
```json
{
  "id": "uuid",
  "name": "Europe vs USA 2025",
  "start_date": "2025-06-15",
  "end_date": "2025-06-17",
  "country_code": "ES",
  "secondary_country_code": "FR",
  "tertiary_country_code": null,
  "location": "Spain, France",
  "max_players": 24,
  "handicap_type": "OFFICIAL",
  "handicap_percentage": 90.0,
  "team_assignment": "MANUAL",
  "status": "ACTIVE",
  "creator_id": "uuid",
  "enrolled_count": 12,
  "is_creator": true,
  "created_at": "2025-11-18T10:00:00Z",
  "updated_at": "2025-11-18T10:00:00Z"
}
```

**Errores esperados:**
- `404 Not Found`: Competición no existe
- `401 Unauthorized`: Token inválido

---

#### **1.4 Update Competition**

**Endpoint:** `PUT /api/v1/competitions/{competition_id}`
**Auth:** Required (JWT - solo creador)
**Descripción:** Actualiza competición (SOLO en estado DRAFT)

**Request Body (todos los campos opcionales):**
```json
{
  "name": "New Competition Name",
  "start_date": "2025-06-20",
  "end_date": "2025-06-22",
  "country_code": "IT",
  "max_players": 30,
  "handicap_percentage": 85.0
  // ... cualquier campo excepto id, status, creator_id
}
```

**Response esperada (200 OK):**
```json
{
  // Competición actualizada completa (mismo formato que GET)
}
```

**Errores esperados:**
- `400 Bad Request`: Validación fallida
- `403 Forbidden`: Usuario no es el creador O competición no está en DRAFT
- `404 Not Found`: Competición no existe

---

#### **1.5 Delete Competition**

**Endpoint:** `DELETE /api/v1/competitions/{competition_id}`
**Auth:** Required (JWT - solo creador)
**Descripción:** Elimina competición (SOLO en estado DRAFT)

**Response esperada (204 No Content):**
```
(sin body)
```

**Errores esperados:**
- `403 Forbidden`: Usuario no es el creador O competición no está en DRAFT
- `404 Not Found`: Competición no existe

---

### **2. Competition State Transitions**

#### **2.1 Activate Competition**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/activate`
**Auth:** Required (JWT - solo creador)
**Descripción:** DRAFT → ACTIVE

**Request Body:** `{}` (vacío)

**Response esperada (200 OK):**
```json
{
  // Competición con status="ACTIVE"
}
```

**Errores esperados:**
- `400 Bad Request`: Transición inválida (ej: competición no está en DRAFT)
- `403 Forbidden`: Usuario no es el creador

---

#### **2.2 Close Enrollments**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/close-enrollments`
**Auth:** Required (JWT - solo creador)
**Descripción:** ACTIVE → CLOSED

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Competición con status="CLOSED"
}
```

---

#### **2.3 Start Competition**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/start`
**Auth:** Required (JWT - solo creador)
**Descripción:** CLOSED → IN_PROGRESS

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Competición con status="IN_PROGRESS"
}
```

---

#### **2.4 Complete Competition**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/complete`
**Auth:** Required (JWT - solo creador)
**Descripción:** IN_PROGRESS → COMPLETED

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Competición con status="COMPLETED"
}
```

---

#### **2.5 Cancel Competition**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/cancel`
**Auth:** Required (JWT - solo creador)
**Descripción:** Cualquier estado → CANCELLED

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Competición con status="CANCELLED"
}
```

---

### **3. Enrollments**

#### **3.1 Request Enrollment**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/enrollments`
**Auth:** Required (JWT)
**Descripción:** Usuario solicita unirse a competición (ACTIVE)

**Request Body:**
```json
{
  // Vacío o puede incluir campos adicionales en el futuro
}
```

**Response esperada (201 Created):**
```json
{
  "id": "enrollment-uuid",
  "competition_id": "competition-uuid",
  "user_id": "user-uuid",
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "status": "REQUESTED",
  "team": null,
  "custom_handicap": null,
  "created_at": "2025-11-18T10:00:00Z"
}
```

**Errores esperados:**
- `400 Bad Request`: Competición no está ACTIVE
- `409 Conflict`: Usuario ya está inscrito

---

#### **3.2 Get Enrollments**

**Endpoint:** `GET /api/v1/competitions/{competition_id}/enrollments`
**Auth:** Required (JWT)
**Descripción:** Lista inscripciones de una competición

**Query Parameters (opcionales):**
```
?status=APPROVED    // Filtrar por estado
?team=A            // Filtrar por equipo
```

**Response esperada (200 OK):**
```json
[
  {
    "id": "enrollment-uuid",
    "competition_id": "competition-uuid",
    "user_id": "user-uuid",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "status": "APPROVED",
    "team": "A",
    "custom_handicap": 15.5,
    "created_at": "2025-11-18T10:00:00Z"
  }
  // ... más enrollments
]
```

---

#### **3.3 Approve Enrollment**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/enrollments/{enrollment_id}/approve`
**Auth:** Required (JWT - solo creador)
**Descripción:** Aprueba una solicitud de inscripción

**Request Body:**
```json
{
  "team": "A"  // OPCIONAL: A o B
}
```

**Response esperada (200 OK):**
```json
{
  // Enrollment con status="APPROVED" y team asignado
}
```

**Errores esperados:**
- `403 Forbidden`: Usuario no es el creador
- `400 Bad Request`: Enrollment no está en REQUESTED o INVITED

---

#### **3.4 Reject Enrollment**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/enrollments/{enrollment_id}/reject`
**Auth:** Required (JWT - solo creador)
**Descripción:** Rechaza una solicitud de inscripción

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Enrollment con status="REJECTED"
}
```

---

#### **3.5 Cancel Enrollment**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/enrollments/{enrollment_id}/cancel`
**Auth:** Required (JWT - jugador inscrito)
**Descripción:** Jugador cancela su solicitud antes de ser aprobada

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Enrollment con status="CANCELLED"
}
```

---

#### **3.6 Withdraw from Competition**

**Endpoint:** `POST /api/v1/competitions/{competition_id}/enrollments/{enrollment_id}/withdraw`
**Auth:** Required (JWT - jugador inscrito)
**Descripción:** Jugador se retira después de ser aprobado

**Request Body:** `{}`

**Response esperada (200 OK):**
```json
{
  // Enrollment con status="WITHDRAWN"
}
```

---

#### **3.7 Set Custom Handicap**

**Endpoint:** `PUT /api/v1/competitions/{competition_id}/enrollments/{enrollment_id}/handicap`
**Auth:** Required (JWT - solo creador)
**Descripción:** Establece hándicap custom para un jugador

**Request Body:**
```json
{
  "custom_handicap": 15.5
}
```

**Response esperada (200 OK):**
```json
{
  // Enrollment con custom_handicap actualizado
}
```

---

### **4. Countries (Required for Location Dropdowns)**

#### **4.1 Get All Countries**

**Endpoint:** `GET /api/v1/countries`
**Auth:** Required (JWT)
**Descripción:** Obtiene lista de todos los países activos

**Response esperada (200 OK):**
```json
[
  {
    "code": "ES",
    "name_en": "Spain",
    "name_es": "España",
    "active": true
  },
  {
    "code": "FR",
    "name_en": "France",
    "name_es": "Francia",
    "active": true
  }
  // ... más países
]
```

**Notas:**
- El frontend muestra `name_en` en los dropdowns
- Se almacena `code` para enviar en las peticiones de creación/actualización
- Solo se devuelven países con `active=true`

---

#### **4.2 Get Adjacent Countries**

**Endpoint:** `GET /api/v1/countries/{country_code}/adjacent`
**Auth:** Required (JWT)
**Descripción:** Obtiene países adyacentes a un país específico

**Response esperada (200 OK):**
```json
[
  {
    "code": "FR",
    "name_en": "France",
    "name_es": "Francia",
    "active": true
  },
  {
    "code": "PT",
    "name_en": "Portugal",
    "name_es": "Portugal",
    "active": true
  }
  // ... más países adyacentes
]
```

**Notas:**
- Usado para poblar el dropdown de países secundario y terciario
- Solo se devuelven países adyacentes según la tabla `country_adjacencies`
- El frontend calcula la intersección para el tercer país

---

## 🎨 Estados (Status)

### **Competition Status**
```javascript
DRAFT        // Creada, en edición
ACTIVE       // Abierta a inscripciones
CLOSED       // Inscripciones cerradas
IN_PROGRESS  // Torneo en curso
COMPLETED    // Finalizado
CANCELLED    // Cancelado
```

### **Enrollment Status**
```javascript
REQUESTED    // Jugador solicitó unirse
INVITED      // Creador invitó al jugador
APPROVED     // Aprobado y asignado a equipo
REJECTED     // Solicitud rechazada
CANCELLED    // Jugador canceló antes de aprobación
WITHDRAWN    // Jugador se retiró después de aprobación
```

---

## 🎨 Frontend Color Coding

El frontend usa estos colores para los badges (Tailwind CSS):

**Competition Status:**
```javascript
DRAFT:       bg-gray-100 text-gray-700
ACTIVE:      bg-green-100 text-green-700
CLOSED:      bg-yellow-100 text-yellow-700
IN_PROGRESS: bg-blue-100 text-blue-700
COMPLETED:   bg-purple-100 text-purple-700
CANCELLED:   bg-red-100 text-red-700
```

**Enrollment Status:**
```javascript
REQUESTED: bg-yellow-100 text-yellow-700
INVITED:   bg-blue-100 text-blue-700
APPROVED:  bg-green-100 text-green-700
REJECTED:  bg-red-100 text-red-700
CANCELLED: bg-gray-100 text-gray-700
WITHDRAWN: bg-orange-100 text-orange-700
```

---

## 🔒 Reglas de Autorización

| Acción | Quién puede hacerlo |
|--------|---------------------|
| Create Competition | Cualquier usuario autenticado |
| View Competition | Cualquier usuario autenticado |
| Update Competition | Solo creador + status DRAFT |
| Delete Competition | Solo creador + status DRAFT |
| Activate/Close/Start/Complete | Solo creador |
| Cancel Competition | Solo creador |
| Request Enrollment | Cualquier usuario (excepto creador) |
| Approve/Reject Enrollment | Solo creador |
| Cancel Enrollment | Solo el usuario inscrito |
| Withdraw | Solo el usuario inscrito |
| Set Custom Handicap | Solo creador |

---

## 🚨 Manejo de Errores

**Formato de error esperado:**
```json
{
  "detail": "Mensaje de error descriptivo"
}
```

El frontend muestra `error.detail` en toast notifications.

**Códigos HTTP esperados:**
- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado
- `204 No Content` - Eliminación exitosa
- `400 Bad Request` - Validación fallida
- `401 Unauthorized` - Sin autenticación o token expirado
- `403 Forbidden` - Sin permisos para esta acción
- `404 Not Found` - Recurso no existe
- `409 Conflict` - Conflicto (ej: duplicado)
- `500 Internal Server Error` - Error del servidor

---

## 📝 Notas Importantes

### **1. Campo `is_creator`**
El backend debe calcular este campo dinámicamente basado en:
```python
is_creator = (competition.creator_id == current_user.id)
```

### **2. Campo `enrolled_count`**
Debe contar solo enrollments con `status == "APPROVED"`:
```python
enrolled_count = count(enrollments where status == "APPROVED")
```

### **3. Campo `location`**
Debe formatearse como string legible:
```python
# Si solo country_code:
location = "Spain"

# Si country_code + secondary_country_code:
location = "Spain, France"

# Si los 3 países:
location = "Spain, France, Italy"
```

### **4. Validación de países adyacentes**
El backend debe validar que los países especificados sean adyacentes usando la tabla `country_adjacencies`.

### **5. Transiciones de estado**
El backend debe validar que las transiciones sean válidas según el estado actual (usar eventos de dominio).

### **6. User Data en Enrollments**
Los endpoints de enrollments deben incluir:
- `user_name`: `"{first_name} {last_name}"`
- `user_email`: email del usuario

### **7. CORS**
Asegurarse de que FastAPI tenga configurado CORS para:
```python
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
    # ... otros orígenes según sea necesario
]
```

---

## 🧪 Testing Checklist

Para verificar que el backend está correcto, probar:

- [ ] Crear competición con datos mínimos
- [ ] Crear competición con todos los campos opcionales
- [ ] Listar competiciones vacío y con datos
- [ ] Filtrar competiciones por estado
- [ ] Obtener competición por ID (creador y no creador)
- [ ] Actualizar competición en DRAFT
- [ ] Intentar actualizar competición en ACTIVE (debe fallar 403)
- [ ] Eliminar competición en DRAFT
- [ ] Intentar eliminar competición en ACTIVE (debe fallar 403)
- [ ] Transiciones de estado en orden correcto
- [ ] Intentar transición inválida (debe fallar 400)
- [ ] Solicitar inscripción en competición ACTIVE
- [ ] Intentar inscripción duplicada (debe fallar 409)
- [ ] Aprobar inscripción como creador
- [ ] Rechazar inscripción como creador
- [ ] Intentar aprobar inscripción como no-creador (debe fallar 403)
- [ ] Cancelar inscripción como jugador
- [ ] Retirarse después de aprobación
- [ ] Establecer hándicap custom como creador
- [ ] Token expirado (debe devolver 401)

---

## 📞 Contacto

Para dudas o aclaraciones sobre esta especificación:
- **Frontend Branch:** `claude/adapt-frontend-competitions-01HrXTbj77c5WWJnsGGh31gn`
- **Commit:** `a61c0bc - feat: integrate frontend with Competition module from backend`

---

**Última actualización:** 18 de Noviembre de 2025
**Versión:** 1.0.0
