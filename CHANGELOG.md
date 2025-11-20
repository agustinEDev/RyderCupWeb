# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Changed
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
