import Tee from '../value_objects/Tee';
import Hole from '../value_objects/Hole';

/**
 * GolfCourse Entity
 * Represents a golf course in the system
 */
class GolfCourse {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.countryCode = data.country_code || data.countryCode;
    this.courseType = data.course_type || data.courseType;
    this.creatorId = data.creator_id || data.creatorId;
    this.approvalStatus = data.approval_status || data.approvalStatus;
    this.rejectionReason = data.rejection_reason || data.rejectionReason || null;
    this.totalPar = data.total_par || data.totalPar;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;

    // New fields v2.0.0 (Sprint 1: Golf Course Management)
    this.originalGolfCourseId = data.original_golf_course_id || data.originalGolfCourseId || null;
    this.isPendingUpdate = data.is_pending_update || data.isPendingUpdate || false;

    // Solo viene cuando se ha preguntado por cercanía; el resto de las veces es
    // null. Con `??` en vez de `||` porque un campo a menos de 50 m devuelve 0,
    // que es una distancia real y no una ausencia de dato.
    this.distanceKm = data.distance_km ?? data.distanceKm ?? null;

    // La ubicacion viaja entera o no viaja: el backend la trata como un objeto
    // que se reemplaza de una pieza, no campo a campo. Se guarda tal cual la
    // manda la API —con sus claves en snake_case normalizadas— y se deja en
    // null cuando no consta, que es lo que distingue "no lo sabemos" de "esta
    // vacia". Las coordenadas van juntas por definicion: media coordenada no
    // situa nada, y el backend rechaza una sin la otra.
    const ubicacion = data.location ?? null;
    this.location = ubicacion
      ? {
          latitude: ubicacion.latitude ?? null,
          longitude: ubicacion.longitude ?? null,
          address: ubicacion.address ?? null,
          city: ubicacion.city ?? null,
          province: ubicacion.province ?? null,
        }
      : null;

    // Value Objects
    this.tees = (data.tees || []).map(tee =>
      tee instanceof Tee ? tee : Tee.fromDTO(tee)
    );
    this.holes = (data.holes || []).map(hole =>
      hole instanceof Hole ? hole : Hole.fromDTO(hole)
    );
  }

  /**
   * Si la ubicacion trae algo que pintar. Un objeto con los cinco valores a
   * null llega igual que uno ausente para quien lo muestra, y sin esto cada
   * pantalla repetiria las comprobaciones.
   *
   * Las coordenadas cuentan solo COMPLETAS, que es la misma regla del backend:
   * media coordenada no situa nada, y `LocationDTO` rechaza una sin la otra. Sin
   * este matiz, un campo con solo la latitud daria "si hay ubicacion" y la
   * pantalla pintaria el titulo sobre una lista vacia, que es justo lo que se
   * quiere evitar.
   */
  hasLocation() {
    if (!this.location) return false;

    const { latitude, longitude, address, city, province } = this.location;
    const tieneCoordenadas = latitude !== null && longitude !== null;

    return tieneCoordenadas || Boolean(address || city || province);
  }

  /**
   * Check if this golf course is a clone (update proposal)
   */
  isClone() {
    return this.originalGolfCourseId !== null;
  }

  /**
   * Check if this golf course has a pending update
   */
  hasPendingUpdate() {
    return this.isPendingUpdate === true;
  }

  /**
   * Check if the course is approved
   */
  isApproved() {
    return this.approvalStatus === 'APPROVED';
  }

  /**
   * Check if the course is pending approval
   */
  isPending() {
    return this.approvalStatus === 'PENDING_APPROVAL';
  }

  /**
   * Check if the course was rejected
   */
  isRejected() {
    return this.approvalStatus === 'REJECTED';
  }

  /**
   * Get the badge color based on approval status
   */
  getStatusColor() {
    switch (this.approvalStatus) {
      case 'APPROVED':
        return 'green';
      case 'PENDING_APPROVAL':
        return 'yellow';
      case 'REJECTED':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Convert to DTO for API requests
   */
  toDTO() {
    return {
      id: this.id,
      name: this.name,
      country_code: this.countryCode,
      course_type: this.courseType,
      creator_id: this.creatorId,
      approval_status: this.approvalStatus,
      rejection_reason: this.rejectionReason,
      total_par: this.totalPar,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      original_golf_course_id: this.originalGolfCourseId,
      is_pending_update: this.isPendingUpdate,
      // Va tambien de vuelta: sin esto, `new GolfCourse(campo.toDTO())` perdia
      // la ubicacion en silencio. En una edicion, un `location` a null significa
      // "no la toques" para el backend, asi que reenviarlo asi es seguro.
      location: this.location,
      tees: this.tees.map(tee => tee.toDTO()),
      holes: this.holes.map(hole => hole.toDTO()),
    };
  }
}

export default GolfCourse;
