// src/domain/value_objects/Location.js
import { CountryCode } from './CountryCode';
import { InvalidLocationError } from './InvalidLocationError';

export class Location {
  /**
   * @type {CountryCode}
   * @private
   */
  #mainCountry;

  /**
   * @type {?CountryCode}
   * @private
   */
  #adjacentCountry1;

  /**
   * @type {?CountryCode}
   * @private
   */
  #adjacentCountry2;

  /**
   * Creates an instance of Location.
   * @param {CountryCode} mainCountry The main country code.
   * @param {?CountryCode} [adjacentCountry1=null] The first adjacent country code.
   * @param {?CountryCode} [adjacentCountry2=null] The second adjacent country code.
   * @throws {InvalidLocationError} If the location configuration is invalid.
   */
  constructor(mainCountry, adjacentCountry1 = null, adjacentCountry2 = null) {
    // 1. Validate main_country (must be a CountryCode instance)
    if (!(mainCountry instanceof CountryCode)) {
      throw new InvalidLocationError("Main country must be an instance of CountryCode.");
    }
    this.#mainCountry = mainCountry;

    // 2. Validate adjacent_country_1 (must be CountryCode or null)
    if (adjacentCountry1 !== null && !(adjacentCountry1 instanceof CountryCode)) {
      throw new InvalidLocationError("Adjacent country 1 must be an instance of CountryCode or null.");
    }
    this.#adjacentCountry1 = adjacentCountry1;

    // 3. Validate adjacent_country_2 (must be CountryCode or null)
    if (adjacentCountry2 !== null && !(adjacentCountry2 instanceof CountryCode)) {
      throw new InvalidLocationError("Adjacent country 2 must be an instance of CountryCode or null.");
    }
    this.#adjacentCountry2 = adjacentCountry2;

    // 4. Validate that adjacent_country_2 does not exist without adjacent_country_1
    if (this.#adjacentCountry2 && !this.#adjacentCountry1) {
      throw new InvalidLocationError(
        "Cannot have adjacent_country_2 without adjacent_country_1. Order must be: main → adj1 → adj2"
      );
    }

    // 5. Validate that there are no duplicate countries
    const countries = this.getAllCountries();
    const uniqueCountryCodes = new Set(countries.map(c => c.value()));
    if (countries.length !== uniqueCountryCodes.size) {
      const countryCodesArray = countries.map(c => c.value());
      throw new InvalidLocationError(
        `Countries cannot be repeated. Found: ${countryCodesArray.join(', ')}`
      );
    }

    Object.freeze(this);
  }

  /**
   * Returns the main country code.
   * @returns {CountryCode}
   */
  mainCountry() {
    return this.#mainCountry;
  }

  /**
   * Returns the first adjacent country code.
   * @returns {?CountryCode}
   */
  adjacentCountry1() {
    return this.#adjacentCountry1;
  }

  /**
   * Returns the second adjacent country code.
   * @returns {?CountryCode}
   */
  adjacentCountry2() {
    return this.#adjacentCountry2;
  }

  /**
   * Checks if the tournament is multi-country.
   * @returns {boolean} True if there's at least one adjacent country, false otherwise.
   */
  isMultiCountry() {
    return this.#adjacentCountry1 !== null;
  }

  /**
   * Gets a list of all involved country codes.
   * @returns {CountryCode[]} List of countries (always at least 1).
   */
  getAllCountries() {
    const countries = [this.#mainCountry];
    if (this.#adjacentCountry1) {
      countries.push(this.#adjacentCountry1);
    }
    if (this.#adjacentCountry2) {
      countries.push(this.#adjacentCountry2);
    }
    return countries;
  }

  /**
   * Counts the total number of countries.
   * @returns {number} Number of countries (1, 2, or 3).
   */
  countryCount() {
    return this.getAllCountries().length;
  }

  /**
   * Checks if a specific country is included in the location.
   * @param {CountryCode} countryCode The country code to search for.
   * @returns {boolean} True if the country is included, false otherwise.
   */
  includesCountry(countryCode) {
    return this.getAllCountries().some(c => c.equals(countryCode));
  }

  /**
   * Returns a string representation of the Location.
   * @returns {string} e.g., "ES", "ES / PT", "ES / PT / FR".
   */
  toString() {
    const countryCodes = this.getAllCountries().map(c => c.value());
    return countryCodes.join(' / ');
  }

  /**
   * Compares this Location with another for equality.
   * Two Locations are equal if they have the same countries in the same order.
   * @param {Location} other The other Location to compare with.
   * @returns {boolean} True if the locations are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof Location)) return false;

    // Compare main countries
    if (!this.#mainCountry.equals(other.#mainCountry)) return false;

    // Compare adjacentCountry1
    const adj1Equal = (this.#adjacentCountry1 === null && other.#adjacentCountry1 === null) ||
                      (this.#adjacentCountry1 && other.#adjacentCountry1 && this.#adjacentCountry1.equals(other.#adjacentCountry1));
    if (!adj1Equal) return false;

    // Compare adjacentCountry2
    const adj2Equal = (this.#adjacentCountry2 === null && other.#adjacentCountry2 === null) ||
                      (this.#adjacentCountry2 && other.#adjacentCountry2 && this.#adjacentCountry2.equals(other.#adjacentCountry2));
    if (!adj2Equal) return false;

    return true;
  }
}