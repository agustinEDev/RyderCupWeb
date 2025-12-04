# ADR-001: Adopción de Clean Architecture en Frontend React

**Fecha**: 23 de noviembre de 2025
**Estado**: Aceptado
**Decisores**: Equipo de desarrollo frontend

## Contexto y Problema

Necesitamos establecer una arquitectura escalable y mantenible para el frontend de RyderCupFriends. El sistema debe ser:

- Testeable unitariamente sin dependencias de React
- Independiente de la librería UI (React actualmente, pero intercambiable)
- Separación clara entre lógica de negocio y presentación
- Escalable conforme crezca el proyecto
- Alineado con la arquitectura del backend (Clean Architecture + DDD)

## Opciones Consideradas

1. **Arquitectura Tradicional de React**: Componentes con lógica mezclada
2. **Clean Architecture Adaptada**: Domain → Application → Infrastructure → Presentation
3. **Feature-Sliced Design**: Organización por features
4. **Atomic Design**: Organización por nivel de componentes

## Decisión

**Adoptamos Clean Architecture adaptada a React** con la siguiente estructura:

```
src/
├── domain/                     # Capa de Dominio (independiente)
│   ├── entities/               # Entidades de negocio (User, Competition)
│   ├── value-objects/          # Value Objects inmutables
│   └── repositories/           # Interfaces de repositorio
├── application/                # Capa de Aplicación
│   ├── use-cases/              # Casos de uso (business logic)
│   └── dto/                    # Data Transfer Objects
├── infrastructure/             # Capa de Infraestructura
│   ├── auth/                   # ApiAuthRepository
│   ├── user/                   # ApiUserRepository
│   ├── competition/            # ApiCompetitionRepository
│   └── mappers/                # Anti-Corruption Layer
├── composition/                # Composition Root (DI manual)
│   └── index.js                # Inyección de dependencias
└── pages/                      # Capa de Presentación (React)
    ├── Login.jsx
    ├── Dashboard.jsx
    └── ...
```

## Justificación

### Ventajas de Clean Architecture en Frontend:

1. **Testabilidad Superior**
   - Use Cases testeables sin renderizar React
   - Mocks fáciles de implementar
   - 419 tests ejecutándose en ~5 segundos

2. **Independencia de React**
   - Lógica de negocio en JavaScript puro
   - Migración a otro framework sería sencilla
   - Componentes solo renderizado y eventos

3. **Sincronización con Backend**
   - Mismo patrón arquitectónico (frontend ↔ backend)
   - Mappers en ambos lados (Anti-Corruption Layer)
   - Repository Pattern consistente

4. **Mantenibilidad**
   - Separación clara: UI vs Business Logic
   - Cambios en API no afectan entidades de dominio
   - Código más limpio y comprensible

### Implementación Específica:

- **Framework UI**: React 18 con Vite 5
- **Router**: React Router v6 (en Presentation Layer)
- **State Management**: useState + Context API (solo UI state)
- **Data Fetching**: Repositories (abstracción sobre fetch API)
- **Testing**: Vitest con organización por capas

## Consecuencias

### Positivas:
- ✅ 419 tests unitarios con 100% pass rate
- ✅ Lógica de negocio testeable sin renderizar React
- ✅ Componentes React simples (solo presentación)
- ✅ Fácil mockear APIs en tests
- ✅ Migración a otro framework sería viable

### Negativas:
- ❌ Mayor cantidad de archivos y carpetas
- ❌ Curva de aprendizaje para desarrolladores nuevos
- ❌ Más boilerplate inicial (Use Cases, Repositories, Mappers)
- ❌ Puede parecer over-engineering para proyectos pequeños

### Riesgos Mitigados:
- **Complejidad**: Documentación exhaustiva en CLAUDE.md
- **Boilerplate**: Patrones reutilizables y templates
- **Curva de aprendizaje**: Ejemplos claros y tests bien documentados

## Validación

La decisión se considera exitosa si:
- [x] Tests ejecutan en < 10 segundos (✅ ~5s con 419 tests)
- [x] Use Cases independientes de React (✅ JavaScript puro)
- [x] Fácil agregar nuevos módulos (✅ User, Competition, Enrollment)
- [x] Componentes React simples (<200 líneas) (✅ Promedio 150 líneas)

## Referencias

- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design in React](https://khalilstemmler.com/articles/domain-driven-design-intro/)
- [React Clean Architecture Example](https://github.com/dev-mastery/comments-api)
- Backend ADR-001: Clean Architecture (backend)

## Notas de Implementación

### Ya Implementado (27 Nov 2025):
- ✅ Estructura de carpetas completa
- ✅ Entidades: User, Competition, Enrollment
- ✅ Value Objects: Email, Password, CountryCode, EnrollmentStatus
- ✅ 35+ Use Cases implementados
- ✅ Repository Pattern en todos los módulos
- ✅ Anti-Corruption Layer (Mappers)
- ✅ Composition Root con inyección de dependencias
- ✅ 419 tests pasando (35 archivos)

### Métricas:
- **Cobertura de tests**: Domain 100%, Application 90%, Utils 100%
- **Tiempo de tests**: ~5 segundos
- **Líneas de código**: ~15,000 (bien organizado)
- **Componentes React**: 20+ páginas, todos < 250 líneas

## Relacionado

- ADR-002: React + Vite como stack tecnológico
- ADR-005: Sentry para error tracking
- ADR-006: Code Splitting y Lazy Loading
