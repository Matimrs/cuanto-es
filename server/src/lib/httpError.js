/** Error con la forma del contrato de la API: { error: { code, message, fields? } }. */
class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

module.exports = HttpError;
