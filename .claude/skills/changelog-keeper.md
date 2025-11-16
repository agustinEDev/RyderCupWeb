# Skill: Changelog Keeper

**Descripción:** Mantener un CHANGELOG.md siguiendo el formato de Keep a Changelog

**Cuándo usar:** Después de cada cambio significativo, commit importante o release

---

## Principios de Keep a Changelog

### Filosofía
- Los changelogs son **para humanos, no para máquinas**
- Cada versión debe tener su propia entrada
- Mismos tipos de cambios deben agruparse
- Versiones y secciones deben ser enlazables
- La versión más reciente va primero
- Se debe mostrar la fecha de publicación de cada versión
- Mencionar si se sigue [Versionado Semántico](https://semver.org/lang/es/)

### Tipos de Cambios

Siempre usa estas categorías en este orden:

1. **`Added`** (Agregado) - Para funcionalidades nuevas
2. **`Changed`** (Cambiado) - Para cambios en funcionalidades existentes
3. **`Deprecated`** (Obsoleto) - Para funcionalidades que pronto se eliminarán
4. **`Removed`** (Eliminado) - Para funcionalidades eliminadas
5. **`Fixed`** (Arreglado) - Para corrección de bugs
6. **`Security`** (Seguridad) - Para invitar a actualizar en caso de vulnerabilidades

---

## Formato del CHANGELOG.md

```markdown
# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Nuevas funcionalidades que aún no están en producción

### Changed
- Cambios en funcionalidades existentes

### Fixed
- Corrección de bugs

## [1.1.0] - 2024-03-15

### Added
- Nueva funcionalidad X para mejorar Y
- Componente Z para gestionar datos

### Changed
- Mejorado el rendimiento de la página principal
- Actualizada la interfaz de usuario del dashboard

### Fixed
- Corregido error en el formulario de login
- Solucionado problema de carga en móviles

### Security
- Actualizado paquete vulnerable X a versión segura

## [1.0.0] - 2024-01-10

### Added
- Lanzamiento inicial del proyecto
- Sistema de autenticación
- Dashboard básico
- Gestión de usuarios

[Unreleased]: https://github.com/usuario/proyecto/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/usuario/proyecto/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/usuario/proyecto/releases/tag/v1.0.0
```

---

## Workflow de Trabajo

### 1. Durante el Desarrollo

Después de cada cambio significativo, actualiza la sección `[Unreleased]`:

```markdown
## [Unreleased]

### Added
- Sistema de notificaciones toast con react-hot-toast
- Componente PasswordStrengthIndicator con indicador visual
- Animaciones con Framer Motion en Login y Register

### Changed
- Mejorado el diseño del Dashboard con cards de estadísticas
- Actualizado sistema de colores en Tailwind (verde golf, dorado, navy)

### Fixed
- Corregido error de validación en formulario de registro
```

### 2. Al Crear un Release

Cuando hagas un release (ej: v1.2.0):

1. Mueve todo de `[Unreleased]` a una nueva sección con la versión
2. Añade la fecha del release
3. Crea una nueva sección vacía `[Unreleased]`
4. Actualiza los enlaces al final del archivo

```markdown
## [Unreleased]

## [1.2.0] - 2024-11-16

### Added
- Sistema de notificaciones toast con react-hot-toast
- Componente PasswordStrengthIndicator con indicador visual

### Changed
- Mejorado el diseño del Dashboard con cards de estadísticas
```

---

## Versionado Semántico (SemVer)

Formato: `MAJOR.MINOR.PATCH` (ej: 2.4.1)

- **MAJOR** (2.x.x): Cambios incompatibles con versiones anteriores (breaking changes)
- **MINOR** (x.4.x): Nueva funcionalidad compatible con versiones anteriores
- **PATCH** (x.x.1): Correcciones de bugs compatibles con versiones anteriores

### Ejemplos:

- `1.0.0 → 1.1.0`: Agregaste una nueva feature (Added)
- `1.1.0 → 1.1.1`: Arreglaste un bug (Fixed)
- `1.1.1 → 2.0.0`: Hiciste un cambio que rompe compatibilidad (Breaking Change)

---

## Reglas de Escritura

### ✅ BIEN:
```markdown
### Added
- Sistema de autenticación con JWT
- Dashboard con estadísticas de usuarios
- Validación de formularios en tiempo real
```

### ❌ MAL:
```markdown
### Added
- Se agregó autenticación
- Dashboard
- Validaciones
```

### Consejos:
- Usa verbos en pasado o sustantivos: "Agregado", "Sistema de...", "Componente..."
- Sé específico pero conciso
- Agrupa cambios relacionados
- No uses puntos al final de cada línea
- Usa lenguaje claro y entendible para usuarios finales

---

## Comandos Útiles

### Crear CHANGELOG inicial
```bash
touch CHANGELOG.md
# Luego copia la estructura base
```

### Ver últimos commits para documentar
```bash
git log --oneline --since="1 week ago"
```

### Generar changelog automáticamente (opcional)
```bash
npm install -g conventional-changelog-cli
conventional-changelog -p angular -i CHANGELOG.md -s
```

---

## Integración con Commits

Si usas **Conventional Commits**, puedes mapear tipos:

| Commit Type | Changelog Section |
|-------------|-------------------|
| `feat:` | Added |
| `fix:` | Fixed |
| `perf:` | Changed |
| `refactor:` | Changed |
| `docs:` | (Opcional) Added o Changed |
| `style:` | (No incluir) |
| `test:` | (No incluir) |
| `chore:` | (No incluir) |
| `BREAKING CHANGE:` | Changed (indicar breaking) |

---

## Ejemplo Real del Proyecto

```markdown
# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [1.1.0] - 2024-11-16

### Added
- Sistema de notificaciones toast con react-hot-toast
- Componente PasswordStrengthIndicator con barra visual de 4 niveles
- Componente PasswordInput con toggle mostrar/ocultar contraseña
- Iconos modernos con Lucide React en toda la aplicación
- Animaciones de entrada con Framer Motion en Login, Register, Dashboard y Profile
- Sistema de badges en perfil de usuario (Email Verificado, Cuenta Activa, Hándicap Registrado)
- Cards de estadísticas con gradientes en Dashboard (Torneos, Hándicap, Estado)

### Changed
- Rediseñado completo del Dashboard con cards visuales modernas
- Mejorado diseño del Profile con header card y badges dinámicos
- Actualizado sistema de colores Tailwind con tonalidades 50-900 (verde golf, dorado, navy)
- Mejoradas páginas de Login y Register con mejor UX y validaciones visuales
- Traducidos todos los textos a español en flujos de autenticación
- Optimizados botones de acción con iconos y efectos hover

### Fixed
- Corregido error de toast.warning a toast con icono personalizado en Login
- Alineados enlaces y botones en Login/Register para mejor consistencia visual

### Security
- Agregado rate limiting visual en formulario de login (5 intentos por 5 minutos)
- Mejorada validación de fortaleza de contraseña con feedback visual

## [1.0.0] - 2024-11-12

### Added
- Sistema de autenticación completo (Login, Register, Verify Email)
- Dashboard básico con perfil de usuario
- Gestión de hándicaps (manual y desde RFEG)
- Integración con backend FastAPI
- Rutas protegidas con ProtectedRoute
- Sistema de validaciones mejorado
- Headers de seguridad en producción

[Unreleased]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agustinEDev/RyderCupWeb/releases/tag/v1.0.0
```

---

## Checklist al Actualizar CHANGELOG

- [ ] ¿Está en la sección correcta? (Unreleased o versión específica)
- [ ] ¿Usa el tipo de cambio correcto? (Added, Changed, Fixed, etc.)
- [ ] ¿Es claro para un usuario final?
- [ ] ¿Está en español? (para este proyecto)
- [ ] ¿Los enlaces al final están actualizados?
- [ ] ¿La fecha tiene formato YYYY-MM-DD?

---

**Referencias:**
- [Keep a Changelog (Español)](https://keepachangelog.com/es-ES/1.0.0/)
- [Versionado Semántico](https://semver.org/lang/es/)
- [Conventional Commits](https://www.conventionalcommits.org/es/)
