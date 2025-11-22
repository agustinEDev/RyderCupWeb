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

4.  **Refactorizar Verificación de Email:**
    *   **Estado:** Completado
    *   **Objetivo:** Mover la lógica de `VerifyEmail.jsx` a un caso de uso.
    *   **Pasos:**
        1.  Crear `VerifyEmailUseCase.js`.
        2.  Añadir el método `verifyEmail(token)` a `IAuthRepository`.
        3.  Implementar el método en `ApiAuthRepository`.
        4.  Refactorizar `VerifyEmail.jsx`.

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
    *   **Estado:** Completado
    *   **Objetivo:** Mover la lógica de `CreateCompetition.jsx` a un caso de uso.
    *   **Pasos:**
        1.  Crear `CreateCompetitionUseCase.js`.
        2.  Implementar `create` en `ICompetitionRepository` y en su implementación concreta `ApiCompetitionRepository`.
        3.  Refactorizar `CreateCompetition.jsx` para que use el caso de uso.

3.  **Refactorizar Listado de Competiciones:**
    *   **Estado:** Siguiente
    *   **Objetivo:** Mover la lógica de `Competitions.jsx` a un caso de uso.
    *   **Pasos:**
        1.  Crear `ListUserCompetitionsUseCase.js`.
        2.  Implementar `findUserCompetitions` en `ICompetitionRepository` y `ApiCompetitionRepository`.
        3.  Refactorizar `Competitions.jsx` para que use el caso de uso.

4.  **Refactorizar Detalle de Competición y Gestión de Estado:**
    *   **Estado:** Pendiente
    *   **Objetivo:** Mover la lógica de `CompetitionDetail.jsx` a casos de uso.
    *   **Pasos:**
        1.  Crear `GetCompetitionDetailUseCase.js`.
        2.  Crear casos de uso para cada transición de estado (ej. `ActivateCompetitionUseCase`, `StartCompetitionUseCase`, etc.).
        3.  Implementar los métodos correspondientes en `ICompetitionRepository`.
        4.  Refactorizar `CompetitionDetail.jsx` para que orqueste las llamadas a los diferentes casos de uso.

5.  **Refactorizar Flujo de Inscripción (Enrollment):**
    *   **Estado:** Pendiente
    *   **Objetivo:** Mover la lógica de inscripción a casos de uso.
    *   **Pasos:**
        1.  Crear `RequestEnrollmentUseCase.js`, `ApproveEnrollmentUseCase.js`, etc.
        2.  Implementar los métodos en `ICompetitionRepository` (o un `IEnrollmentRepository` separado si se justifica).
        3.  Refactorizar los componentes de UI relacionados.

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
