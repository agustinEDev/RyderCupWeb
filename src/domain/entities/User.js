import Email from '../value_objects/Email';
import Password from '../value_objects/Password'; // 1. Importar Password VO
import { CountryCode } from '../value_objects/CountryCode';

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
    country_code = null, // Nacionalidad opcional del usuario
    gender = null, // Gender: 'MALE', 'FEMALE', or null
    domain_events = [], // Array vacío por defecto para List
  }) {
    // Validaciones básicas de la entidad
    if (!id || !email || !first_name || !last_name) {
      throw new Error('User entity requires id, email, first_name, and last_name');
    }

    // Validate gender if provided
    const validGenders = ['MALE', 'FEMALE'];
    if (gender !== null && !validGenders.includes(gender)) {
      throw new Error(`Invalid gender: ${gender}. Must be 'MALE', 'FEMALE', or null`);
    }

    this.id = id;
    this.email = email instanceof Email ? email : new Email(email);
    // 2. Modificar el password para que pueda ser una instancia de Password Value Object
    this.password = password instanceof Password ? password : password; // Si no es un VO, se asume que es la cadena (hasheada)
    this.firstName = first_name;
    this.lastName = last_name;
    this.handicap = handicap;
    this.handicapUpdatedAt = handicap_updated_at; // Mantener como string de fecha o null
    this.createdAt = created_at; // Mantener como string de fecha o null
    this.updatedAt = updated_at; // Mantener como string de fecha o null
    this.emailVerified = email_verified;
    this.verificationToken = verification_token;
    // Country code es opcional: puede ser null, string o CountryCode VO
    this.countryCode = country_code
      ? (country_code instanceof CountryCode ? country_code : new CountryCode(country_code))
      : null;
    this.gender = gender;
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
      email: this.email.getValue(),
      // 3. Obtener el valor del Password VO si es uno, o pasar la cadena directamente
      password: this.password instanceof Password ? this.password.getValue() : this.password,
      first_name: this.firstName,
      last_name: this.lastName,
      handicap: this.handicap,
      handicap_updated_at: this.handicapUpdatedAt,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      email_verified: this.emailVerified,
      verification_token: this.verificationToken,
      country_code: this.countryCode ? this.countryCode.value() : null,
      gender: this.gender,
      // domain_events no se persistirían directamente
    };
  }
}

export default User;
