const HttpError = require('../lib/httpError');

// Valida req.body con un esquema zod antes de llegar al controlador (FR-012, Principio VI).
// Si pasa, reemplaza req.body por los datos parseados (normalizados y sin campos extra).
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '_';
        if (!fields[field]) fields[field] = issue.message;
      }
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', fields));
    }
    req.body = result.data;
    return next();
  };
}

module.exports = validate;
