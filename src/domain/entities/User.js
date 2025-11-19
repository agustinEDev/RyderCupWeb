class User {
  constructor({
    id,
    email,
    password, // Aunque el hashing se maneja externamente, la entidad puede poseerlo.
    first_name,
    last_name,
    handicap = null, // Valor por defecto para Optional
    handicap_updated_at = null,
    created_at = null,
    updated_at = null,
    email_verified = false, // Valor por defecto para bool
    verification_token = null,
    domain_events = [], // Array vacío por defecto para List
  }) {
    // Validaciones básicas de la entidad
    if (!id || !email || !first_name || !last_name) {
      throw new Error('User entity requires id, email, first_name, and last_name');
    }

    this.id = id;
    this.email = email;
    this.password = password; // Se asume que se pasa de forma segura
    this.firstName = first_name;
    this.lastName = last_name;
    this.handicap = handicap;
    this.handicapUpdatedAt = handicap_updated_at; // Mantener como string de fecha o null
    this.createdAt = created_at; // Mantener como string de fecha o null
    this.updatedAt = updated_at; // Mantener como string de fecha o null
    this.emailVerified = email_verified;
    this.verificationToken = verification_token;
    this.domainEvents = domain_events;
  }

  // Ejemplo de método de negocio que podría tener una entidad
  updateHandicap(newHandicap, updatedAt) {
    // Aquí irían validaciones de negocio sobre el hándicap si las hubiera
    // Por ejemplo, que el hándicap esté en un rango válido.
    if (newHandicap !== null && (newHandicap < -10 || newHandicap > 54)) {
      throw new Error('Handicap must be between -10.0 and 54.0 or null');
    }
    this.handicap = newHandicap;
    this.handicapUpdatedAt = updatedAt; // Podría ser una fecha de JS o un string ISO
    // this.domainEvents.push(new HandicapUpdatedEvent(this.id, newHandicap, updatedAt));
  }

  // Ejemplo de método para marcar el email como verificado
  markEmailAsVerified() {
    this.emailVerified = true;
    this.verificationToken = null; // Token ya no es necesario
    // this.domainEvents.push(new EmailVerifiedEvent(this.id, this.email));
  }

  // Método para obtener un objeto plano para la persistencia o la API si es necesario
  toPersistence() {
    return {
      id: this.id,
      email: this.email,
      password: this.password, // Precaución: no se debe enviar el password en texto plano
      first_name: this.firstName,
      last_name: this.lastName,
      handicap: this.handicap,
      handicap_updated_at: this.handicapUpdatedAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      email_verified: this.emailVerified,
      verification_token: this.verificationToken,
      // domain_events no se persistirían directamente
    };
  }
}

export default User;
