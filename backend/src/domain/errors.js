class DomainError extends Error {
  constructor(message, status = 400, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { DomainError };
