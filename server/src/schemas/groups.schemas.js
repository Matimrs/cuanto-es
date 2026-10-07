const { z } = require('zod');

// Texto obligatorio de 1 a `max` caracteres, recortado. Lo reutilizan grupos, alias y categorías.
function requiredText(label, max = 100) {
  return z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} no puede superar los ${max} caracteres`);
}

// FR-004: nombre de 1 a 100 caracteres después de recortar. Los demás campos se descartan (FR-029).
const groupInputSchema = z.object({ name: requiredText('El nombre') });

module.exports = { requiredText, groupInputSchema };
