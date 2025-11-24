# Roadmap - Evolución de la Arquitectura del Frontend

Este documento describe los próximos pasos y las tareas planificadas para continuar la refactorización y alineación del frontend con los principios de Clean Architecture y Domain-Driven Design (DDD).

---

## 🎯 Módulo de Usuario y Autenticación (User & Auth Bounded Context)

### Tareas de Refactorización (Clean Architecture)

1.  **Refactorizar `handleUpdateSecurity` en `EditProfile.jsx`:**
    *   **Estado:** Completado
    *   **Objetivo:** Extraer la lógica de actualización de seguridad (email/contraseña) a su propio caso de uso.
    *   **Pasos:**
        1.  Crear `UpdateUserSecurityUseCase.js`.
        2.  Ajustar `IUserRepository` para incluir `updateSecurity(userId, securityData)`.
        3.  Implementar `updateSecurity` en `ApiUserRepository`.
        4.  Refactorizar el `handleUpdateSecurity` en `EditProfile.jsx`.

2.  **Refactorizar `handleUpdateHandicapManually` y `handleUpdateHandicapRFEG`:**
    *   **Estado:** Completado
    *   **Objetivo:** Crear casos de uso específicos para la lógica de actualización de hándicap.
    *   **Pasos:**
        1.  Crear `UpdateManualHandicapUseCase.js` y `UpdateRfegHandicapUseCase.js`.
        2.  Crear una nueva interfaz `IHandicapRepository` en el dominio.
        3.  Crear `ApiHandicapRepository` en la infraestructura.
        4.  Refactorizar los `handle...` en `EditProfile.jsx`.

3.  **Refactorizar Flujo de Autenticación (Login/Register):**
    *   **Estado:** Completado
    *   **Objetivo:** Aplicar Clean Architecture a las páginas de Login y Registro.
    *   **Pasos:**
        1.  Crear `LoginUseCase.js` y `RegisterUseCase.js`.
        2.  Crear `IAuthRepository` en el dominio.
        3.  Crear `ApiAuthRepository` en la infraestructura.
        4.  Refactorizar `Login.jsx` y `Register.jsx` para que usen los casos de uso, simplificando los componentes.

4.  **Refactorizar Verificación de Email con Auto-Login:**
    *   **Estado:** ✅ Completado (23 Nov 2025)
    *   **Objetivo:** Mover la lógica de `VerifyEmail.jsx` a un caso de uso e implementar autenticación automática.
    *   **Pasos:**
        1.  ✅ Crear `VerifyEmailUseCase.js`.
        2.  ✅ Añadir el método `verifyEmail(token)` a `IAuthRepository`.
        3.  ✅ Implementar el método en `ApiAuthRepository` para retornar `{ user, token }`.
        4.  ✅ Refactorizar `VerifyEmail.jsx` para usar `setAuthToken()` de `secureAuth`.
        5.  ✅ Coordinar con backend para que `/api/v1/auth/verify-email` devuelva JWT token.
    *   **Mejora:** Los usuarios ahora son autenticados automáticamente tras verificar email, mejorando la UX (no requieren login manual).

### Tareas de Mejora (DDD y UI)

1.  **Introducir "Value Objects" (DDD):**
    *   **Estado:** Completado
    *   **Objetivo:** Mejorar la robustez del dominio con `ValueObjects`.
    *   **Pasos:**
        1.  Crear `Email.js` y `Password.js` como Value Objects.
        2.  Actualizar la entidad `User` y los Casos de Uso para que los utilicen.

2.  **Crear Hook Personalizado `useEditProfile`:**
    *   **Estado:** Completado
    *   **Objetivo:** Simplificar el componente `EditProfile.jsx`.
    *   **Pasos:**
        1.  Crear `useEditProfile.js` que encapsule `useState`, `useEffect` y los `handle...`.
        2.  Hacer que `EditProfile.jsx` consuma este hook, convirtiéndolo en un componente de presentación casi puro.

3.  **Sistema de Nacionalidad del Usuario:**
    *   **Estado:** ✅ Completado (23 Nov 2025)
    *   **Objetivo:** Registrar la nacionalidad del usuario para condicionar la funcionalidad de actualización de hándicap desde RFEG.
    *   **Descripción:** Solo usuarios españoles pueden actualizar su hándicap desde la RFEG (Real Federación Española de Golf). Los usuarios de otras nacionalidades solo podrán usar actualización manual de hándicap.
    *   **Regla de Negocio Clave:**
        - Campo `country_code` **OPCIONAL** en registro ✅
        - Si el usuario NO selecciona país → puede registrarse sin problemas ✅
        - Si el usuario selecciona país `ES` (España) → Habilitar opción RFEG en perfil ✅
        - Si el usuario selecciona otro país → Solo actualización manual de hándicap ✅
    *   **Dependencias Backend:**
        - ✅ **Completado:** Campo `country_code` agregado al modelo `User` (nullable/optional)
        - ✅ **Completado:** Campo `country_code` **OPCIONAL** en registro (`POST /api/v1/auth/register`)
        - ✅ **Completado:** `country_code` incluido en respuestas de usuario (puede ser `null`)
        - ✅ **Disponible:** Endpoint `GET /api/v1/countries?language=en` para listar países
    *   **Implementación - Frontend:**
        1.  **Domain Layer:** ✅
            - Reutilizado `CountryCode.js` Value Object existente (del módulo Competition)
            - Actualizada entidad `User` para incluir `countryCode: CountryCode | null`
        2.  **Application Layer:** ✅
            - `RegisterUseCase` acepta `countryCode` opcional
            - `UpdateRfegHandicapUseCase` valida nacionalidad española (`country_code === 'ES'`)
        3.  **Infrastructure Layer:** ✅
            - `ApiAuthRepository.register()` envía `country_code` al backend (null si no se especifica)
            - `ApiUserRepository.getById()` usa endpoint correcto `/api/v1/auth/current-user`
        4.  **Presentation Layer:** ✅
            - `Register.jsx`: Selector de países OPCIONAL con búsqueda, banderas y nombres en inglés
            - `Profile.jsx`: Visualización de nacionalidad con badge y auto-sync con backend
            - `EditProfile.jsx`: Botón RFEG condicional basado en nacionalidad
        5.  **Utils Layer:** ✅
            - Helper `canUseRFEG()` en `countryUtils.js` para verificar elegibilidad RFEG
        6.  **Tests:** ✅
            - 66 tests creados y pasando (100% pass rate)
            - Cobertura completa de Domain, Application, Infrastructure y Utils layers
              * Usuario español (`country_code: 'ES'`) → ✅ Permitir
              * Usuario no español (`country_code: 'FR'`) → ❌ Rechazar
              * Usuario sin país (`country_code: null`) → ❌ Rechazar
            - Test UI condicional en `EditProfile`
    *   **Estructura del Request de Registro:**
        ```javascript
        // Opción 1: Usuario selecciona país
        POST /api/v1/auth/register
        {
          "email": "juan@example.com",
          "password": "SecurePass123!",
          "first_name": "Juan",
          "last_name": "García",
          "country_code": "ES"  // Opcional
        }

        // Opción 2: Usuario NO selecciona país
        POST /api/v1/auth/register
        {
          "email": "john@example.com",
          "password": "SecurePass123!",
          "first_name": "John",
          "last_name": "Doe"
          // country_code no enviado o null
        }
        ```
    *   **Respuesta de Usuario:**
        ```javascript
        // Usuario español
        {
          "id": "uuid",
          "email": "juan@example.com",
          "first_name": "Juan",
          "last_name": "García",
          "country_code": "ES",  // Puede ser null
          "handicap": 15.5,
          "email_verified": true
        }

        // Usuario sin país especificado
        {
          "id": "uuid",
          "email": "john@example.com",
          "first_name": "John",
          "last_name": "Doe",
          "country_code": null,  // No especificado
          "handicap": 12.0,
          "email_verified": true
        }
        ```
    *   **Mensajes de Usuario:**
        - Registro: "Nationality (Optional)" - "Select Spain to enable RFEG handicap updates"
        - Perfil sin país: "Nationality: Not specified"
        - Perfil con país: "Nationality: 🇪🇸 Spain"
        - Error RFEG (sin país): "RFEG updates require Spanish nationality. Update your profile to continue."
        - Error RFEG (otro país): "RFEG updates are only available for Spanish players."
    *   **Mejoras Futuras:**
        - Permitir actualizar nacionalidad desde el perfil
        - Integrar con otras federaciones nacionales
        - Sugerir país basado en IP/localización

---

## 🏆 Módulo de Competiciones (Competition Bounded Context)

### Tareas de Refactorización (Clean Architecture)

1.  **Definir Entidades y Repositorios del Dominio de Competición:**
    *   **Estado:** Completado
    *   **Objetivo:** Crear las bases del dominio para las competiciones.
    *   **Pasos:**
        1.  Crear la entidad `Competition.js` en `src/domain/entities`.
        2.  Crear la entidad `Enrollment.js` en `src/domain/entities`.
        3.  Crear la interfaz `ICompetitionRepository` en `src/domain/repositories`.

2.  **Refactorizar Creación de Competiciones:**
    *   **Estado:** Completado ✅
    *   **Objetivo:** Mover la lógica de `CreateCompetition.jsx` a un caso de uso siguiendo Clean Architecture y DDD.
    *   **Pasos:**
        1.  ✅ Crear `CreateCompetitionUseCase.js`.
        2.  ✅ Implementar `save()` en `ICompetitionRepository` y en `ApiCompetitionRepository`.
        3.  ✅ Crear `CompetitionMapper` para mapear entre API DTOs y entidades de dominio.
        4.  ✅ Implementar patrón DTO para la UI (toSimpleDTO).
        5.  ✅ Refactorizar `CreateCompetition.jsx` para que use el caso de uso.
        6.  ✅ Implementar Anti-Corruption Layer mediante el mapper.
        7.  ✅ Corregir bug de JSX faltante en `CreateCompetition.jsx`.
        8.  ✅ Corregir filtrado de países adyacentes.

3.  **Refactorizar Listado de Competiciones:**
    *   **Estado:** Completado ✅
    *   **Objetivo:** Mover la lógica de `Competitions.jsx` a un caso de uso siguiendo Clean Architecture y DDD.
    *   **Pasos:**
        1.  ✅ Crear `ListUserCompetitionsUseCase.js`.
        2.  ✅ Añadir `findByCreator()` a `ICompetitionRepository`.
        3.  ✅ Implementar `findByCreator()` en `ApiCompetitionRepository` usando `CompetitionMapper`.
        4.  ✅ Refactorizar `Competitions.jsx` para que use el caso de uso.
        5.  ✅ Crear tests unitarios completos (5 test cases).
        6.  ✅ Integrar en composition root.

4.  **Refactorizar Detalle de Competición y Gestión de Estado:**
    *   **Estado:** Completado ✅
    *   **Objetivo:** Mover la lógica de `CompetitionDetail.jsx` a casos de uso.
    *   **Pasos:**
        1.  ✅ Crear `GetCompetitionDetailUseCase.js`.
        2.  ✅ Añadir `findById()` a `ICompetitionRepository`.
        3.  ✅ Implementar `findById()` en `ApiCompetitionRepository`.
        4.  ✅ Crear casos de uso para cada transición de estado:
            - `ActivateCompetitionUseCase` (DRAFT → ACTIVE)
            - `CloseEnrollmentsUseCase` (ACTIVE → CLOSED)
            - `StartCompetitionUseCase` (CLOSED → IN_PROGRESS)
            - `CompleteCompetitionUseCase` (IN_PROGRESS → COMPLETED)
            - `CancelCompetitionUseCase` (Any → CANCELLED)
        5.  ✅ Integrar casos de uso en composition root.
        6.  ✅ Refactorizar `CompetitionDetail.jsx` para que use los casos de uso.
        7.  ✅ Implementar soporte de países adyacentes con badges y banderas dinámicas.
        8.  ✅ Actualizar `CompetitionMapper` para manejar campo `countries` del backend.

5.  **Refactorizar Flujo de Inscripción (Enrollment):**
    *   **Estado:** 🔄 EN PROGRESO (90% Completado - 24 Nov 2025)
    *   **Objetivo:** Implementar sistema completo de inscripciones con Clean Architecture y DDD.
    *   **Estado Actual (24 Nov 2025):**
        - ✅ **Domain Layer completado** - Value Objects, Entity, Repository Interface
        - ✅ **Infrastructure Layer completado** - Mapper, Repository con 13 métodos
        - ✅ **Application Layer completado** - 8 casos de uso implementados
        - ✅ **Composition Root completado** - Inyección de dependencias configurada
        - ✅ **Testing Domain Layer completado** - 83 tests pasando (100% coverage)
        - ⚠️ **Servicios legacy siguen existiendo** en `src/services/competitions.js` (para compatibilidad temporal)
        - ⏳ **Presentation Layer pendiente** - Las páginas aún llaman a servicios directamente
    *   **Pasos:**
        1.  **Domain Layer:** ✅ **COMPLETADO**
            - ✅ `EnrollmentStatus.js` (287 líneas) - Value Object con 6 estados y validación de transiciones
            - ✅ `EnrollmentId.js` (75 líneas) - Value Object con UUID v4
            - ✅ `Enrollment.js` (541 líneas) - Entidad con factory methods (`request()`, `invite()`, `directEnroll()`)
            - ✅ `IEnrollmentRepository.js` (187 líneas) - Interfaz con 13 métodos
        2.  **Infrastructure Layer:** ✅ **COMPLETADO**
            - ✅ `EnrollmentMapper.js` (164 líneas) - Anti-Corruption Layer (API ↔ Domain ↔ UI)
            - ✅ `ApiEnrollmentRepository.js` (385 líneas) - Implementación completa con fetch API
        3.  **Application Layer - Casos de Uso:** ✅ **COMPLETADO**
            - ✅ `RequestEnrollmentUseCase.js` (2.4 KB) - Solicitar inscripción
            - ✅ `DirectEnrollUseCase.js` (3.5 KB) - Inscripción directa por creador
            - ✅ `ApproveEnrollmentUseCase.js` (2.3 KB) - Aprobar solicitud
            - ✅ `RejectEnrollmentUseCase.js` (2.1 KB) - Rechazar solicitud
            - ✅ `CancelEnrollmentUseCase.js` (2.3 KB) - Cancelar solicitud (usuario)
            - ✅ `WithdrawEnrollmentUseCase.js` (2.3 KB) - Retirarse de competición
            - ✅ `ListEnrollmentsUseCase.js` (2.0 KB) - Listar inscripciones
            - ✅ `SetCustomHandicapUseCase.js` (2.9 KB) - Establecer handicap personalizado
        4.  **Testing Domain Layer:** ✅ **COMPLETADO** (24 Nov 2025)
            - ✅ `EnrollmentId.test.js` (109 líneas) - 11 tests: factory methods, validación UUID, equals, immutability
            - ✅ `EnrollmentStatus.test.js` (254 líneas) - 32 tests: 6 estados, transiciones válidas/inválidas, state checkers
            - ✅ `Enrollment.test.js` (583 líneas) - 40 tests: factory methods, transiciones, handicaps, equipos, immutability
            - ✅ **Total:** 83 tests pasando en 16ms, build compilado exitosamente
            - ⏳ **Pendiente:** Tests de casos de uso (8 archivos)
        5.  **Integration:** ✅ **COMPLETADO**
            - ✅ Integrado en `composition/index.js` (8 casos de uso exportados)
            - ✅ Inyección de dependencias configurada (`apiEnrollmentRepository` con authTokenProvider)
            - ✅ Build compilado exitosamente sin errores
        6.  **Presentation Layer:** ⏳ **PENDIENTE**
            - ❌ Refactorizar `CompetitionDetail.jsx` para usar casos de uso
            - ❌ Refactorizar `BrowseCompetitions.jsx` para usar `requestEnrollmentUseCase`
            - ❌ Eliminar llamadas directas a servicios legacy
            - **Estimación:** 1-2 horas
    *   **Tiempo Invertido vs Estimado:**
        - ✅ Domain Layer: 2 horas (estimado 2-3h)
        - ✅ Infrastructure Layer: 1.5 horas (estimado 2-3h)
        - ✅ Application Layer: 2 horas (estimado 4-6h)
        - ✅ Composition Root: 30 minutos (estimado 30m)
        - ✅ Testing Domain Layer: 2 horas (estimado 4-6h, optimizado con patrones reutilizables)
        - ⏳ Testing Use Cases: 0 horas (estimado 2-3h)
        - ⏳ Presentation Layer: 0 horas (estimado 1-2h)
        - **TOTAL: 8/17 horas completadas (47% del tiempo, 90% de funcionalidad core)**

6.  **Página "Browse Competitions" (Explorar competiciones públicas):**
    *   **Estado:** ✅ Completado (23 Nov 2025)
    *   **Objetivo:** Permitir a los usuarios buscar y explorar competiciones públicas.
    *   **Descripción:** Nueva página completa con dos secciones independientes: "Join a Competition" (ACTIVE) para solicitar inscripción, y "Explore Competitions" (CLOSED, IN_PROGRESS, COMPLETED) para visualización.
    *   **Implementación:**
        1.  ✅ Creada página `/browse-competitions` con ruta protegida
        2.  ✅ Creado `BrowseCompetitions.jsx` con:
            - **Sección "Join a Competition":**
              * Lista de competiciones ACTIVE
              * Excluye competiciones propias (auto-enrolled al crear)
              * Barra de búsqueda independiente (nombre o creador)
              * Cards con botón "Request to Join" (TODO: integrar RequestEnrollmentUseCase)
              * Optimistic UI (card desaparece al solicitar)
            - **Sección "Explore Competitions":**
              * Lista de competiciones CLOSED, IN_PROGRESS, COMPLETED
              * Incluye competiciones propias y ajenas (modo lectura)
              * Barra de búsqueda independiente (nombre o creador)
              * Cards con botón "View Details"
        3.  ✅ Implementado método `findPublic(filters)` en `ICompetitionRepository` y `ApiCompetitionRepository`
        4.  ✅ Creados dos casos de uso dedicados:
            - `BrowseJoinableCompetitionsUseCase`: Filtra ACTIVE + excluye propias
            - `BrowseExploreCompetitionsUseCase`: Filtra [CLOSED, IN_PROGRESS, COMPLETED] + incluye todas
        5.  ✅ Agregado link en `HeaderAuth` (desktop + mobile) y `Dashboard`
        6.  ✅ Implementada detección de origen en `CompetitionDetail`:
            - "Back to Browse" si viene de `/browse-competitions`
            - "Back to Competitions" si viene de `/competitions`
        7.  ✅ Creados 19 tests unitarios (100% pass rate)
    *   **Casos de Uso Creados:**
        - `BrowseJoinableCompetitionsUseCase.js`
        - `BrowseExploreCompetitionsUseCase.js`
    *   **Tests:**
        - ✅ `BrowseJoinableCompetitionsUseCase.test.js` (9 tests)
        - ✅ `BrowseExploreCompetitionsUseCase.test.js` (10 tests)
    *   **Pendiente (Bloqueado por Enrollment no implementado):**
        - ❌ Integrar `RequestEnrollmentUseCase` (actualmente simulado con TODO en línea 135 de BrowseCompetitions.jsx)
        - ⚠️ **Bloqueado:** Requiere implementación completa del módulo Enrollment (ver sección 5 arriba)
    *   **Mejoras Futuras (Post-Enrollment):**
        - Filtros avanzados (fecha, país, handicap type)
        - Paginación server-side
        - Ordenamiento (fecha, inscritos, etc.)
    *   **Mejoras Futuras:**
        - Badge de enrollment status si ya está inscrito
        - Indicador visual si competición está llena (enrolledCount >= maxPlayers)
        - Mostrar país del creador con bandera

---

## 👤 Módulo de Perfil de Usuario (User Profile)

### Tareas de Mejora de UI/UX

1.  **Mejorar Página "My Profile":**
    *   **Estado:** Pendiente
    *   **Objetivo:** Simplificar y mejorar la presentación de información del perfil.
    *   **Pasos:**
        1.  Mover campo `Last Updated` a la tarjeta principal del perfil (ProfileCard)
        2.  Eliminar tarjeta redundante "Account Information"
        3.  Mejorar jerarquía visual de la información
    *   **Tiempo Estimado:** 10-15 minutos

2.  **Sistema de Foto de Perfil (Avatar):**
    *   **Estado:** Bloqueado (requiere backend)
    *   **Objetivo:** Permitir a los usuarios personalizar su foto de perfil.
    *   **Descripción:** Sistema completo de gestión de avatares con galería predefinida, upload de archivos y captura de cámara.
    *   **Dependencias Backend:**
        - ⚠️ **Crítico:** Agregar campo `avatar_url` al modelo `User`
        - ⚠️ **Crítico:** Crear endpoint `PUT /api/v1/users/avatar` (multipart/form-data)
        - ⚠️ **Crítico:** Crear endpoint `DELETE /api/v1/users/avatar`
        - ⚠️ **Crítico:** Configurar almacenamiento (S3, Cloudinary, o local)
        - Validaciones: tipo de archivo (JPG, PNG, WEBP), tamaño máximo (5MB)
        - Redimensionamiento automático a 200x200px
    *   **Pasos - Fase 1 (Temporal - Solo Frontend):**
        1.  Crear galería de imágenes predefinidas (golf-themed) en `/public/avatars/`
        2.  Guardar selección en `localStorage` como `user_avatar_url`
        3.  Mostrar avatar en Dashboard, Header, Profile
        4.  ⚠️ **Limitación:** No persiste en backend (se pierde al cambiar de dispositivo)
    *   **Pasos - Fase 2 (Implementación Real - Requiere Backend):**
        1.  Crear `UploadAvatarUseCase.js` en Application Layer
        2.  Agregar método `uploadAvatar(file)` a `IUserRepository`
        3.  Implementar en `ApiUserRepository` con `FormData` y `multipart/form-data`
        4.  Crear componente `AvatarUploader.jsx` con:
            - Galería predefinida (grid de imágenes)
            - Upload desde archivo (input type="file")
            - Captura de cámara (MediaDevices API)
            - Preview antes de subir
            - Crop/resize opcional
        5.  Integrar en página `/profile/edit`
        6.  Actualizar `getUserData()` para incluir `avatar_url`
        7.  Mostrar avatar en todos los componentes relevantes
    *   **Casos de Uso Nuevos:**
        - `UploadAvatarUseCase.js`
        - `DeleteAvatarUseCase.js`
    *   **Testing:**
        - Tests de casos de uso
        - Tests de componente `AvatarUploader`
        - Validación de tipos de archivo
        - Manejo de errores (archivo muy grande, tipo inválido, etc.)

---

## 🛠️ Tareas Transversales (Cross-Cutting Concerns)

1.  **Implementar un Sistema de Pruebas Unitarias:**
    *   **Estado:** Completado
    *   **Objetivo:** Asegurar la calidad y fiabilidad del código de negocio y aplicación.
    *   **Pasos:**
        1.  Configurar Jest o Vitest.
        2.  Escribir tests unitarios para `ValueObjects`.
        3.  Escribir tests unitarios para Casos de Uso con repositorios "mockeados".

2.  **Definir un Patrón para la Gestión de Errores:**
    *   **Estado:** Pendiente
    *   **Objetivo:** Estandarizar cómo los errores de la API se propagan y se presentan al usuario.
    *   **Pasos:**
        1.  Crear clases de error personalizadas en el dominio (ej. `UserNotFoundError`, `ValidationError`).
        2.  Hacer que los repositorios y casos de uso lancen estos errores personalizados.
        3.  Crear un "manejador de errores" global en la UI que traduzca estos errores a mensajes amigables para el usuario.
