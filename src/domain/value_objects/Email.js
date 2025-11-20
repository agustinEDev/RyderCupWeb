class Email {
  constructor(value) {
    if (!Email.isValid(value)) {
      throw new Error('Invalid email address.');
    }
    this._value = value;
  }

  static isValid(email) {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof Email)) {
      return false;
    }
    return this._value === other.getValue();
  }
}

export default Email;