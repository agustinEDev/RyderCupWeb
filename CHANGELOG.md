# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

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

[Unreleased]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agustinEDev/RyderCupWeb/releases/tag/v1.0.0
