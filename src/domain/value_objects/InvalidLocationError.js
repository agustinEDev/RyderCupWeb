// src/domain/value_objects/InvalidLocationError.js

/**
 * Custom error for invalid Location.
 */
export class InvalidLocationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidLocationError';
  }
}
