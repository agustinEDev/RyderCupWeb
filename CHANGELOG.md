# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Added
- **Browse Competitions Feature**: Nueva página completa para descubrir y explorar competiciones públicas:
  - **Dos secciones independientes**:
    - **"Join a Competition"**: Lista competiciones ACTIVE donde el usuario puede solicitar unirse (excluye competiciones propias)
    - **"Explore Competitions"**: Lista competiciones en estado CLOSED, IN_PROGRESS, o COMPLETED para visualización (incluye propias y ajenas)
  - **Domain Layer**: Agregado método `findPublic(filters)` a `ICompetitionRepository` para obtener competiciones públicas con filtros
  - **Infrastructure Layer**: Implementación completa en `ApiCompetitionRepository.findPublic()` con soporte para:
    - Filtrado por status (único o múltiple)
    - Búsqueda por nombre de competición (`searchName`)
    - Búsqueda por nombre/email del creador (`searchCreator`)
    - Exclusión de competiciones propias (`excludeMyCompetitions`)
    - Paginación (`limit`, `offset`)
  - **Application Layer**: Dos casos de uso dedicados con responsabilidad única:
    - `BrowseJoinableCompetitionsUseCase`: Filtra ACTIVE + excluye competiciones propias
    - `BrowseExploreCompetitionsUseCase`: Filtra [CLOSED, IN_PROGRESS, COMPLETED] + incluye todas
  - **Presentation Layer** (`BrowseCompetitions.jsx`):
    - Búsqueda independiente en cada sección (client-side filtering)
    - Componente reutilizable `CompetitionCard` con modo 'joinable' o 'explore'
    - Botón "Request to Join" con optimistic UI (card desaparece al solicitar)
    - Botón "View Details" para competiciones explorables
    - Skeleton states y manejo de errores
    - Integración con `secureAuth` para autenticación
  - **Navegación mejorada**:
    - Links agregados en `HeaderAuth` (desktop + mobile) y `Dashboard`
    - Ruta protegida `/browse-competitions` en `App.jsx`
    - Detección de origen en `CompetitionDetail`: "Back to Browse" o "Back to Competitions" según procedencia
  - **Tests unitarios completos (19 tests - 100% pass rate)**:
    - `BrowseJoinableCompetitionsUseCase.test.js`: 9 tests (filtros, status ACTIVE, excludeMyCompetitions)
    - `BrowseExploreCompetitionsUseCase.test.js`: 10 tests (filtros, múltiples statuses, incluye todas)

### Fixed
- **Email Verification Auto-Login Flow**: Corregido el flujo de verificación de email para autenticar automáticamente al usuario:
  - `ApiAuthRepository.verifyEmail()` ahora retorna `{ user, token }` igual que el login
  - `VerifyEmailUseCase` simplificado para retornar el resultado de autenticación directamente
  - `VerifyEmail.jsx` ahora usa `setAuthToken()` en lugar de `localStorage` directamente
  - Agregado `country_code` a `secureAuth.setUserData()` para completar el perfil de usuario
  - Los usuarios ahora son redirigidos al dashboard después de verificar el email (no requieren login manual)
  - El backend devuelve JWT token en `/api/v1/auth/verify-email` para autenticación automática

### Added
- **Sistema de Nacionalidad del Usuario (User Nationality System)**: Implementación completa del sistema de nacionalidad opcional para usuarios:
  - **Domain Layer**: Campo `countryCode` agregado a la entidad `User` (opcional, nullable)
  - **Value Object**: Reutilización del `CountryCode` VO existente del módulo Competition
  - **RegisterUseCase**: Actualizado para aceptar `countryCode` opcional durante el registro
  - **UpdateRfegHandicapUseCase**: Validación añadida para permitir RFEG solo a usuarios españoles (`country_code === 'ES'`)
  - **Helper `canUseRFEG()`**: Nueva función utilitaria en `countryUtils.js` para verificar elegibilidad RFEG
  - **Register.jsx**: Selector de países OPCIONAL con búsqueda, banderas y nombres en inglés
  - **Profile.jsx**: Visualización de nacionalidad con badge azul mostrando bandera y nombre completo del país
  - **EditProfile.jsx**: Lógica condicional para mostrar/ocultar botón "Update from RFEG" basado en nacionalidad
  - **Auto-sync de datos**: Profile.jsx ahora consulta automáticamente el backend para mantener datos actualizados
- **Inyección de dependencias actualizada**: `UpdateRfegHandicapUseCase` ahora recibe `userRepository` para validar nacionalidad
- **Tests exhaustivos para Sistema de Nacionalidad (66 tests - 100% pass rate)**:
  - `UpdateRfegHandicapUseCase.test.js`: 7 tests (validación de nacionalidad española)
  - `countryUtils.test.js`: 31 tests (canUseRFEG, getCountryFlag, getCountryInfo, getCountriesInfo)
  - `User.test.js`: 17 tests (constructor, country_code field, toPersistence, business methods)
  - `ApiUserRepository.test.js`: 11 tests (getById con endpoint correcto, update, updateSecurity)
- **Auto-sync en useEditProfile hook**: Implementado fetch automático de datos frescos del backend al montar EditProfile
- **Logs de depuración**: Agregados logs comprensivos en UpdateRfegHandicapUseCase, ApiUserRepository, y canUseRFEG para facilitar debugging

###
- **GetCompetitionDetailUseCase (Application Layer)**: Nuevo caso de uso para obtener detalles de una competición:
  - Valida entrada (competitionId requerido).
  - Usa `repository.findById()` para obtener la entidad del dominio.
  - Convierte la entidad a DTO simple para la UI usando `CompetitionMapper.toSimpleDTO()`.
- **findById() en ICompetitionRepository**: Nuevo método de interfaz para consultar una competición por su ID.
- **Casos de uso para transiciones de estado de competiciones**:
  - `ActivateCompetitionUseCase`: DRAFT → ACTIVE
  - `CloseEnrollmentsUseCase`: ACTIVE → CLOSED
  - `StartCompetitionUseCase`: CLOSED → IN_PROGRESS
  - `CompleteCompetitionUseCase`: IN_PROGRESS → COMPLETED
  - `CancelCompetitionUseCase`: Any state → CANCELLED
- **Utilidad de banderas dinámicas** (`countryUtils.js`): Generación de emojis de banderas usando Unicode Regional Indicators para cualquier código ISO de país.
- **Soporte de países adyacentes con nombres bilingües**: Las competiciones ahora muestran países adyacentes con badges visuales que incluyen banderas y nombres completos en inglés/español.
- **Tests unitarios completos para casos de uso de competiciones**: 6 nuevos archivos de test con cobertura exhaustiva:
  - `GetCompetitionDetailUseCase.test.js` (6 test cases)
  - `ActivateCompetitionUseCase.test.js` (7 test cases)
  - `CloseEnrollmentsUseCase.test.js` (6 test cases)
  - `StartCompetitionUseCase.test.js` (7 test cases)
  - `CompleteCompetitionUseCase.test.js` (7 test cases)
  - `CancelCompetitionUseCase.test.js` (9 test cases)
  - Total: 248 tests pasando (todos los módulos).

### Changed
- **Profile.jsx mejorado**:
  - Agregado campo "Last Updated" en tarjeta principal de usuario
  - Agregado campo "Nationality" con badge azul mostrando bandera y nombre del país en inglés
  - Eliminada tarjeta redundante "Account Information"
  - Implementado auto-sync con backend para mantener datos actualizados en cada visita
- **ApiAuthRepository.register()**: Actualizado para enviar `country_code` al backend (con valor `null` si no se especifica)
- **composition/index.js**: Actualizada inyección de dependencias para `UpdateRfegHandicapUseCase` (ahora incluye `userRepository`)
- **ApiUserRepository.getById()**: Cambiado endpoint de `/api/v1/users/{userId}` a `/api/v1/auth/current-user` (el userId se obtiene del JWT token automáticamente)
- **useEditProfile hook**: Refactorizado para hacer auto-sync con backend al montar, similar al patrón usado en Profile.jsx
- **CreateCompetition.jsx payload**: Corregido para coincidir con BACKEND_API_SPEC.md:
  - Eliminados campos no válidos: `team_one_name`, `team_two_name`, `player_handicap`
  - Convertidos a UPPERCASE: `handicap_type` y `team_assignment`
- **ApiCompetitionRepository.findByCreator()**: Eliminado parámetro `creator_id` (el backend filtra automáticamente por usuario autenticado del JWT)
- **Refactor `CompetitionDetail.jsx`**: Refactorizada la página de detalle de competiciones para usar Clean Architecture:
  - Reemplazadas llamadas directas a servicios por casos de uso (`getCompetitionDetailUseCase`, `activateCompetitionUseCase`, etc.).
  - Simplificado el manejo de estado usando solo actualizaciones parciales en transiciones.
  - Mejorada la UI con badges de países que muestran banderas dinámicas y nombres completos.
- **CompetitionMapper actualizado**:
  - Método `toDomain()` ahora maneja campos `secondary_country_code` y `tertiary_country_code` del backend.
  - Método `toSimpleDTO()` genera array `countries` con objetos `{code, name, nameEn, nameEs, flag, isMain}` desde el backend.
  - Soporte para fallback: si la API no devuelve nombres, usa códigos ISO.
- **ApiCompetitionRepository.findById()**: Implementación del método para obtener una competición individual:
  - Llama al endpoint `GET /api/v1/competitions/{id}`.
  - Mapea respuesta de API a entidad del dominio usando `CompetitionMapper.toDomain()`.
  - Adjunta datos originales de la API (`_apiData`) para uso del mapper.

### Fixed
- **Bug en CompetitionMapper**: Corregido error donde `teamAssignment.value` no se llamaba como función, causando renderizado de función en React.
- **Race condition en Competitions.jsx**: Separado el `useEffect` en dos para evitar que `loadCompetitions()` se ejecute antes de que `setUser()` complete.
- **Error 404 en ApiUserRepository.getById()**: Corregido endpoint inexistente `/api/v1/users/{userId}` a `/api/v1/auth/current-user` que sí existe en el backend
- **Datos obsoletos en EditProfile**: Corregido problema donde EditProfile mostraba datos obsoletos del localStorage sin sincronizar con el backend
- **RFEG no funcionaba para usuarios españoles**: Corregido error donde el repositorio intentaba obtener usuario de endpoint inexistente, impidiendo validación de nacionalidad
- **Error 500 al crear competiciones**: Corregido payload enviando campos no válidos (`team_one_name`, `team_two_name`, `player_handicap`) que el backend no acepta
- **Error 500 al listar competiciones**: Corregido envío de parámetro `creator_id` que el backend no acepta (usa JWT automáticamente)
- **Case sensitivity en enums**: Corregido envío de `handicap_type` y `team_assignment` en lowercase cuando el backend espera UPPERCASE
- **Mejor manejo de errores 500**: Agregado logging detallado y mensajes más claros cuando el backend responde con error 500

###
- **E2E Testing with Playwright**: Integrado el framework Playwright para tests End-to-End, incluyendo configuración, scripts y tests para el flujo de login.
- **Unit Test for `CreateCompetitionUseCase`**: Añadido test unitario para el nuevo caso de uso, asegurando su lógica de negocio.
- **CompetitionMapper (Infrastructure Layer)**: Nueva clase `CompetitionMapper` implementada como Anti-Corruption Layer:
  - `toDomain()`: Convierte DTOs de la API (snake_case) a entidades del dominio (Competition).
  - `toDTO()`: Convierte entidades del dominio a DTOs para persistencia.
  - `toSimpleDTO()`: Convierte entidades a DTOs simples optimizados para la UI.
  - Protege el dominio de cambios en la estructura de la API externa.
- **ListUserCompetitionsUseCase (Application Layer)**: Nuevo caso de uso para listar competiciones del usuario:
  - Valida entrada (userId requerido).
  - Llama a `repository.findByCreator()` para obtener entidades del dominio.
  - Convierte entidades a DTOs simples para la UI.
  - Incluye 5 tests unitarios exhaustivos (validación, filtros, errores, casos vacíos).
- **findByCreator() en ICompetitionRepository**: Nuevo método de interfaz para consultar competiciones por creador/usuario.

### Changed
- **Refactor `CreateCompetition`**: Refactorizada la página de creación de competiciones para seguir los principios de Clean Architecture, extrayendo la lógica de negocio a `CreateCompetitionUseCase` y `ApiCompetitionRepository`.
- **Error Message Standardization**: Estandarizado el mensaje de error para credenciales incorrectas (401) en `ApiAuthRepository` para que sea siempre en inglés.
- **Clean Architecture & DDD Compliance**: Implementación completa de patrones arquitectónicos:
  - **ApiCompetitionRepository**: Ahora devuelve entidades del dominio (Competition) en lugar de objetos planos.
  - **CreateCompetitionUseCase**: Transforma entidades de dominio a DTOs simples para la UI usando `CompetitionMapper.toSimpleDTO()`.
  - **Separation of Concerns**: Separación clara entre modelos de dominio, DTOs de API y DTOs de UI.
  - **Repository Pattern**: El repositorio devuelve entidades del dominio, cumpliendo con el patrón.
  - **DTO Pattern**: La UI recibe DTOs optimizados sin depender de Value Objects complejos.
  - **Dependency Inversion**: La infraestructura depende del dominio, no al revés.
- **CreateCompetitionUseCase.test.js**: Test actualizado para mockear `CompetitionMapper` y verificar que el caso de uso devuelve DTOs en lugar de entidades.
- **Refactor `Competitions.jsx`**: Refactorizada la página de listado de competiciones para usar Clean Architecture:
  - Reemplazado llamada directa al servicio `getCompetitions()` por `listUserCompetitionsUseCase.execute()`.
  - Ahora recibe DTOs simples (camelCase) del caso de uso en lugar de datos de API (snake_case).
  - Eliminada dependencia del servicio para obtención de datos (solo se usa para helpers de UI).
- **ApiCompetitionRepository.findByCreator()**: Implementación del método para obtener competiciones de un usuario:
  - Construye query params con `creator_id` y filtros opcionales.
  - Mapea respuestas de API a entidades del dominio usando `CompetitionMapper.toDomain()`.
  - Devuelve array de entidades `Competition`.

### Fixed
- **Vite Test Configuration**: Corregida la configuración de Vitest para que ignore los tests de Playwright, permitiendo que ambos corredores de tests funcionen de forma independiente.
- **Bundler Module Resolution**: Solucionado un error de arranque de la aplicación cambiando la exportación de la entidad `Competition` a una exportación por defecto para resolver un conflicto con el bundler de Vite.
- **Syntax Errors**: Corregidos múltiples errores de sintaxis y de importación en `composition/index.js` y otros archivos introducidos durante la refactorización.
- **Missing JSX in CreateCompetition**: Restaurado el JSX completo del formulario de creación de competiciones que fue accidentalmente reemplazado por un comentario en un commit anterior (854 líneas restauradas).
- **API Response Mapping Error**: Corregido error crítico donde `ApiCompetitionRepository` intentaba crear una entidad Competition directamente con datos de la API en snake_case, causando el error "Team 1 name cannot be empty".
- **Adjacent Country Filtering**: Corregido el filtro de países adyacentes que comparaba incorrectamente `parseInt(countryCode)` en lugar de comparar strings directamente. Ahora el país seleccionado en "Adjacent Country 1" se excluye correctamente de las opciones de "Adjacent Country 2".


### Added
- **Dominio `Competition`**: Implementación completa de la capa de dominio para la gestión de competiciones, siguiendo principios de DDD.
  - **Value Objects**: `CompetitionId`, `CompetitionStatus`, `CompetitionName`, `DateRange`, `Location` (compuesto), `HandicapSettings`, `TeamAssignment` y `CountryCode`.
  - **Entidad**: `Competition` como Agregado Raíz, encapsulando lógica de negocio y transiciones de estado inmutables.
  - **Repositorio**: Interfaz `ICompetitionRepository` para definir el contrato de persistencia.
- **Tests Unitarios**: Cobertura de tests completa para todos los nuevos Value Objects y la entidad `Competition` para garantizar la robustez y el comportamiento esperado.
- **Dashboard**: La tarjeta "Tournaments" ahora muestra dinámicamente el número total de competiciones obtenidas de la API.
- **Dependencia**: Añadido el paquete `uuid` para la generación de identificadores únicos en el dominio.

### Fixed
- **Crear Competición**: Corregido un bug donde el número de jugadores no se guardaba. El campo enviado a la API ahora es `max_players` en lugar de `number_of_players`.
- **Borrar Competición**: Corregido un bug crítico que impedía borrar competiciones. El servicio API ahora maneja correctamente las respuestas `204 No Content` del backend.

### Changed
- **Refactor (Formulario)**: Eliminado el campo `description` del formulario de creación de competiciones para alinearlo con el modelo de dominio de la entidad `Competition`.
- **Refactor (Profile):** Extraída la lógica del componente `EditProfile.jsx` a un hook personalizado `useEditProfile.js`. Esto simplifica el componente a una capa de presentación pura y centraliza el manejo del estado y los efectos secundarios. Se han añadido tests unitarios exhaustivos para el nuevo hook.
- **Refactor (DDD):** Introducidos `Email` y `Password` Value Objects para mejorar la robustez y seguridad del dominio.
  - Refactorizados `User` entity, casos de uso de autenticación (`Login`, `Register`, `UpdateUserSecurity`) y repositorios para utilizar los nuevos Value Objects.
  - Corregidos tests unitarios para alinearse con los nuevos contratos de los casos de uso.
  - Corregida una regresión en la actualización de seguridad del perfil.

### Added
- Implementación de Clean Architecture para el flujo de verificación de email, incluyendo:
  - Caso de uso `VerifyEmailUseCase`.
  - Método `verifyEmail` en `IAuthRepository` y `ApiAuthRepository`.
- Implementación del sistema de pruebas unitarias con Vitest:
  - Configuración de Vitest, `jsdom`, `@testing-library/react`.
  - Creación de `setupTests.js` para configuración global de tests.
  - Creación de tests unitarios para `LoginUseCase`, `RegisterUseCase`, `UpdateUserSecurityUseCase`, `UpdateManualHandicapUseCase`, `UpdateRfegHandicapUseCase`, `UpdateUserProfileUseCase` y `VerifyEmailUseCase`.
- Implementación de Clean Architecture para el flujo de autenticación (Login/Register), incluyendo:
  - Interfaz `IAuthRepository`.
  - Implementación `ApiAuthRepository`.
  - Casos de uso `LoginUseCase` y `RegisterUseCase`.
- Implementación de Clean Architecture para la funcionalidad de actualización de seguridad del usuario (email/contraseña), incluyendo:
  - Caso de uso `UpdateUserSecurityUseCase`.
  - Método `updateSecurity` en `IUserRepository` y `ApiUserRepository`.
- Implementación de Clean Architecture para la gestión de hándicaps (manual y RFEG), incluyendo:
  - Interfaz `IHandicapRepository`.
  - Implementación `ApiHandicapRepository`.
  - Casos de uso `UpdateManualHandicapUseCase` y `UpdateRfegHandicapUseCase`.
- Implementación de Clean Architecture para la funcionalidad de actualización de perfil de usuario. Esto incluye:
  - Definición de la entidad `User` en la capa de dominio.
  - Definición de la interfaz `IUserRepository` en la capa de dominio.
  - Implementación del caso de uso `UpdateUserProfileUseCase` en la capa de aplicación.
  - Implementación de `ApiUserRepository` en la capa de infraestructura para la comunicación con la API.
  - Configuración del "composition root" en `src/composition/index.js` para la inyección de dependencias.

### Changed
- Refactorización de `VerifyEmail.jsx` para utilizar `VerifyEmailUseCase`.
- Refactorización de `Login.jsx` y `Register.jsx` para utilizar `LoginUseCase` y `RegisterUseCase`.
- Manejo de errores mejorado en `ApiAuthRepository` para respuestas de la API (ej. errores 422 de validación).
- Refactorización de `EditProfile.jsx` para utilizar `UpdateUserSecurityUseCase`, `UpdateManualHandicapUseCase` y `UpdateRfegHandicapUseCase`.
- Centralización y mejora del manejo de errores en `ApiUserRepository` y `ApiHandicapRepository` para respuestas de la API (ej. errores 422 de validación).
- Refactorización de `EditProfile.jsx` para utilizar `UpdateUserProfileUseCase` y el sistema de notificaciones `react-hot-toast`.
- Migración completa del sistema de mensajes local (`message` state y `getMessageClassName`) a `react-hot-toast` para una experiencia de usuario consistente y un código más limpio.

### Fixed
- Corrección de un bug en `UpdateUserProfileUseCase` donde faltaba la validación de entrada (`userId`, `updateData`).
- Corrección de un bug en el flujo de registro donde la estructura de la respuesta de la API era asumida incorrectamente, causando un error de "destructuring".
- Corrección de un bug en la actualización de seguridad del usuario donde `confirm_password` no se enviaba al backend, causando un error de validación 422.




## [1.4.0] - 2025-11-17

### Added
- Rediseño completo de página de Login con animaciones Framer Motion
- Rediseño completo de página de Register con animaciones Framer Motion

### Changed
- **BREAKING**: Actualizado @vitejs/plugin-react de 4.2.1 a 4.7.0 para compatibilidad con Vite 7
- Removido header X-XSS-Protection deprecado de vite.config.js (protección XSS ahora vía CSP)
- Removido header X-XSS-Protection deprecado de public/_headers y vercel.json
- Removido header HSTS de vite.config.js (ahora solo en producción vía Netlify/Vercel)
- Migradas imágenes de Unsplash a assets locales en `/public/images/`
  - `golf-background.jpeg` - Background del hero section
  - `hero-tournament.jpeg` - Imagen principal del hero
  - `golf-friends.jpeg` - Imagen de la sección de beneficios

### Fixed
- **CSP Critical Fix**: Actualizado `connect-src` para permitir conexiones a backend de Render
  - Agregado `https://rydercupam-euzt.onrender.com` al CSP
  - Agregado `http://localhost:8000` para desarrollo local
  - Resuelto error: "Refused to connect to backend because it does not appear in connect-src"
- **CSP Compatibility**: Agregado `'unsafe-inline'` a `script-src` y `style-src` para React y Tailwind
- Corregida configuración de headers de seguridad para desarrollo local
- HSTS ya no fuerza HTTPS en entorno de desarrollo (solo producción)
- Eliminada dependencia de URLs externas de Unsplash (previene rate-limiting)

### Security
- **Headers Optimizados**: HSTS solo en producción (Netlify/_headers, vercel.json)
- **XSS Protection**: Deprecado X-XSS-Protection removido, CSP provee protección
- **CSP Actualizado**: Content Security Policy corregido para permitir backend API
- **Assets Locales**: Imágenes locales eliminan dependencia de servicios externos
- **Vite 7 Compatible**: Build tool actualizado con mejoras de seguridad
- **Node.js >= 20.19**: Requisito cumplido (v25.1.0 instalado)

### Performance
- Imágenes locales mejoran tiempo de carga (sin redirecciones a CDN externo)
- Build optimizado con Vite 7.2.2 (2.64s, 0 warnings)

## [1.3.0] - 2025-11-17

### Added
- Meta tag CSP (Content Security Policy) en index.html para protección contra scripts maliciosos
- Sanitización exhaustiva de todos los caracteres peligrosos en validaciones

### Changed
- Pulido de UI/UX en la landing page para mejor experiencia de usuario
- Actualizado package.json y dependencias NPM (0 vulnerabilidades)
- Mejorada función de escape en `src/utils/validation.js` con sanitización más completa
- Actualizado `SECURITY_MIGRATION.md` con documentación extendida de mejoras de seguridad

### Security
- **AUDITORÍA COMPLETA**: Todas las dependencias NPM auditadas y actualizadas
- **0 VULNERABILIDADES**: Ninguna vulnerabilidad detectada en las dependencias
- **CSP Implementado**: Content Security Policy activo para prevenir XSS
- **XSS Sanitization**: Escape completo de caracteres peligrosos: `< > " ' & / \ =`
- Protección mejorada contra inyección de scripts en inputs de usuario

### Documentation
- Expandido `SECURITY_MIGRATION.md` con detalles de las mejoras implementadas

## [1.2.0] - 2024-11-16

### Added
- Utilidades centralizadas de autenticación en `src/utils/secureAuth.js`
- Sistema de migración automática de localStorage a sessionStorage
- Documentación completa de migración a httpOnly cookies en `SECURITY_MIGRATION.md`
- Funciones de gestión de autenticación: `getAuthToken()`, `setAuthToken()`, `getUserData()`, `setUserData()`, `clearAuthData()`
- Validación de expiración de token con buffer de 30 segundos para clock skew

### Changed
- **BREAKING**: Migrado almacenamiento de JWT de localStorage a sessionStorage
- Actualizados todos los componentes y páginas para usar utilidades de `secureAuth`
- Centralizada la lógica de autenticación para mejor mantenibilidad
- Mejorada la validación de tokens con verificación de claim `exp`

### Security
- **IMPORTANTE**: Reducido impacto de vulnerabilidades XSS mediante uso de sessionStorage
- SessionStorage se limpia automáticamente al cerrar la pestaña/ventana
- Almacenamiento aislado por pestaña (tab-scoped) para mejor seguridad
- Tokens ya no persisten entre sesiones del navegador
- Documentada ruta de migración completa a httpOnly cookies para seguridad máxima

### Migration Notes
- Los usuarios existentes se migran automáticamente de localStorage a sessionStorage
- Se requiere re-autenticación después de actualizar (sesiones antiguas en localStorage se limpian)
- Ver `SECURITY_MIGRATION.md` para plan de implementación de httpOnly cookies

## [1.1.0] - 2024-11-16

### Added
- Sistema de notificaciones toast con react-hot-toast para feedback en tiempo real
- Componente PasswordStrengthIndicator con barra visual de 4 niveles de fortaleza
- Componente PasswordInput reutilizable con toggle mostrar/ocultar contraseña
- Iconos modernos SVG con Lucide React integrados en toda la aplicación
- Animaciones de entrada y transiciones con Framer Motion en todas las páginas clave
- Sistema de badges en perfil de usuario (Email Verificado, Cuenta Activa, Hándicap Registrado)
- Cards de estadísticas con gradientes en Dashboard (Torneos, Hándicap, Estado del perfil)
- Enlace "Volver al inicio" en páginas de Login y Register
- Validación visual en tiempo real en formularios de autenticación

### Changed
- Rediseñado completo del Dashboard con cards visuales modernas y gradientes sutiles
- Mejorado diseño del Profile con header card, badges dinámicos y mejor jerarquía visual
- Actualizado sistema de colores Tailwind con tonalidades completas 50-900 (verde golf, dorado, navy)
- Mejoradas páginas de Login y Register con mejor UX, validaciones visuales y animaciones
- Traducidos todos los textos de la interfaz a español en flujos de autenticación
- Optimizados botones de acción con iconos Lucide y efectos hover suaves
- Reorganizadas "Acciones Rápidas" en Dashboard con diseño horizontal y mejores iconos
- Alineados todos los elementos de formulario (inputs, botones, enlaces) para consistencia visual
- Mejorada responsividad en dispositivos móviles y tablets

### Fixed
- Corregido error de toast.warning a toast personalizado con icono de advertencia en Login
- Solucionado problema de alineación de enlaces en formularios de autenticación
- Corregida visualización del botón "Crear Cuenta" para ocupar el ancho completo del formulario

### Security
- Agregado rate limiting con feedback visual en formulario de login (5 intentos por 5 minutos)
- Implementada validación robusta de fortaleza de contraseña con múltiples criterios
- Mejorado sistema de validación centralizado con funciones utilitarias

## [1.0.0] - 2024-11-12

### Added
- Sistema de autenticación completo (Login, Register, Verify Email)
- Dashboard de usuario con información de perfil
- Página de perfil con visualización de datos personales y hándicap
- Sistema de gestión de hándicaps (manual y desde RFEG)
- Integración completa con backend FastAPI
- Sistema de rutas protegidas con componente ProtectedRoute
- Validaciones de formularios con mensajes de error
- ProfileCard componente reutilizable
- EmailVerificationBanner para usuarios sin verificar
- Headers de seguridad HTTP en producción
- Configuración de Tailwind CSS con tema personalizado
- Sistema de navegación con React Router v6

### Security
- Implementado almacenamiento seguro de tokens JWT en localStorage
- Validación de tokens en rutas protegidas
- Sistema de logging seguro (safeLog) que solo funciona en desarrollo
- Configuración de headers de seguridad (X-Content-Type-Options, X-Frame-Options, etc.)
- Eliminación automática de console.log en builds de producción

[Unreleased]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agustinEDev/RyderCupWeb/releases/tag/v1.0.0
