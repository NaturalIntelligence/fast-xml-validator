export default class ValidationError extends Error {
  constructor(message, code, line, col) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.line = line;
    this.col = col;
    Error.captureStackTrace?.(this, this.constructor);
  }
}