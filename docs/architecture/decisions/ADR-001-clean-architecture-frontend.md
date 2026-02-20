# ADR-001: Adoption of Clean Architecture in Frontend React

**Date**: November 23, 2025
**Status**: Accepted
**Decision Makers**: Frontend development team

## Context and Problem

We need to establish a scalable and maintainable architecture for the RyderCupFriends frontend. The system must be:

- Unit testable without React dependencies
- Independent of the UI library (currently React, but interchangeable)
- Clear separation between business logic and presentation
- Scalable as the project grows
- Aligned with the backend architecture (Clean Architecture + DDD)

## Options Considered

1. **Traditional React Architecture**: Components with mixed logic
2. **Adapted Clean Architecture**: Domain → Application → Infrastructure → Presentation
3. **Feature-Sliced Design**: Organization by features
4. **Atomic Design**: Organization by component level

## Decision

**We adopt Clean Architecture adapted to React** with the following structure:

```
src/
├── domain/                     # Domain Layer (independent)
│   ├── entities/               # Business entities (User, Competition)
│   ├── value-objects/          # Immutable Value Objects
│   └── repositories/           # Repository interfaces
├── application/                # Application Layer
│   ├── use-cases/              # Use cases (business logic)
│   └── dto/                    # Data Transfer Objects
├── infrastructure/             # Infrastructure Layer
│   ├── auth/                   # ApiAuthRepository
│   ├── user/                   # ApiUserRepository
│   ├── competition/            # ApiCompetitionRepository
│   └── mappers/                # Anti-Corruption Layer
├── composition/                # Composition Root (manual DI)
│   └── index.js                # Dependency injection
└── pages/                      # Presentation Layer (React)
    ├── Login.jsx
    ├── Dashboard.jsx
    └── ...
```

## Rationale

### Advantages of Clean Architecture in Frontend:

1. **Superior Testability**
   - Use Cases testable without rendering React
   - Easy to implement mocks
   - 419 tests running in ~5 seconds

2. **Independence from React**
   - Business logic in pure JavaScript
   - Migration to another framework would be straightforward
   - Components handle only rendering and events

3. **Synchronization with Backend**
   - Same architectural pattern (frontend ↔ backend)
   - Mappers on both sides (Anti-Corruption Layer)
   - Consistent Repository Pattern

4. **Maintainability**
   - Clear separation: UI vs Business Logic
   - API changes do not affect domain entities
   - Cleaner and more understandable code

### Specific Implementation:

- **UI Framework**: React 18 with Vite 5
- **Router**: React Router v6 (in Presentation Layer)
- **State Management**: useState + Context API (UI state only)
- **Data Fetching**: Repositories (abstraction over fetch API)
- **Testing**: Vitest with layer-based organization

## Consequences

### Positive:
- ✅ 419 unit tests with 100% pass rate
- ✅ Business logic testable without rendering React
- ✅ Simple React components (presentation only)
- ✅ Easy to mock APIs in tests
- ✅ Migration to another framework would be viable

### Negative:
- ❌ Greater number of files and folders
- ❌ Learning curve for new developers
- ❌ More initial boilerplate (Use Cases, Repositories, Mappers)
- ❌ May seem like over-engineering for small projects

### Mitigated Risks:
- **Complexity**: Comprehensive documentation in CLAUDE.md
- **Boilerplate**: Reusable patterns and templates
- **Learning curve**: Clear examples and well-documented tests

## Validation

The decision is considered successful if:
- [x] Tests run in < 10 seconds (✅ ~5s with 419 tests)
- [x] Use Cases independent of React (✅ pure JavaScript)
- [x] Easy to add new modules (✅ User, Competition, Enrollment)
- [x] Simple React components (<200 lines) (✅ Average 150 lines)

## References

- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design in React](https://khalilstemmler.com/articles/domain-driven-design-intro/)
- [React Clean Architecture Example](https://github.com/dev-mastery/comments-api)
- Backend ADR-001: Clean Architecture (backend)

## Implementation Notes

### Already Implemented (Nov 27, 2025):
- ✅ Complete folder structure
- ✅ Entities: User, Competition, Enrollment
- ✅ Value Objects: Email, Password, CountryCode, EnrollmentStatus
- ✅ 35+ Use Cases implemented
- ✅ Repository Pattern in all modules
- ✅ Anti-Corruption Layer (Mappers)
- ✅ Composition Root with dependency injection
- ✅ 419 tests passing (35 files)

### Metrics:
- **Test coverage**: Domain 100%, Application 90%, Utils 100%
- **Test time**: ~5 seconds
- **Lines of code**: ~15,000 (well organized)
- **React components**: 20+ pages, all < 250 lines

## Related

- ADR-002: React + Vite as technology stack
- ADR-005: Sentry for error tracking
- ADR-006: Code Splitting and Lazy Loading
