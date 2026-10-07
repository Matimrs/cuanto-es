const { z } = require('zod');

const MIN_PASSWORD_CHARS = 8;
const MAX_PASSWORD_BYTES = 72; // límite de bcrypt (research R4)

// FR-002: se normaliza antes de validar, guardar o comparar.
const emailSchema = z
  .string({ error: 'El email es obligatorio' })
  .trim()
  .toLowerCase()
  .email('Ingresá un email válido');

// FR-004: mínimo en caracteres Unicode (no unidades UTF-16), máximo en bytes UTF-8.
// La contraseña no se recorta ni se normaliza.
const newPasswordSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .refine((p) => [...p].length >= MIN_PASSWORD_CHARS, {
    message: `La contraseña debe tener al menos ${MIN_PASSWORD_CHARS} caracteres`,
  })
  .refine((p) => Buffer.byteLength(p, 'utf8') <= MAX_PASSWORD_BYTES, {
    message: `La contraseña no puede superar los ${MAX_PASSWORD_BYTES} bytes`,
  });

// z.object descarta los campos desconocidos (FR-014).
const registerSchema = z.object({
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: emailSchema,
  password: newPasswordSchema,
});

// En el login no se aplica la política de contraseña: una contraseña que no la cumple es
// simplemente incorrecta (401), sin revelar la regla.
const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña'),
});

module.exports = { emailSchema, registerSchema, loginSchema };
