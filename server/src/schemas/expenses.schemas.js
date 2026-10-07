const { z } = require('zod');
const { parseMoney } = require('../lib/money');
const { idSchema } = require('./categories.schemas');

const MONEY_MESSAGE =
  'El monto debe ser mayor que cero, tener como máximo 2 decimales y no superar 9.999.999.999,99';

// FR-017: string o número con hasta 2 decimales, mayor que cero. Se transforma a centavos enteros;
// los montos con más decimales se rechazan, no se redondean.
const moneySchema = z
  .union([z.string(), z.number()], { error: 'El monto es obligatorio' })
  .transform((value, ctx) => {
    const cents = parseMoney(value);
    if (cents === null || cents === 0) {
      ctx.addIssue({ code: 'custom', message: MONEY_MESSAGE });
      return z.NEVER;
    }
    return cents;
  });

// Fecha de calendario válida en formato YYYY-MM-DD; se transforma a Date (medianoche UTC).
const dateSchema = z
  .string({ error: 'La fecha es obligatoria' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha tiene que tener el formato AAAA-MM-DD')
  .transform((value, ctx) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      ctx.addIssue({ code: 'custom', message: 'La fecha no existe' });
      return z.NEVER;
    }
    return date;
  });

// Descripción opcional de hasta 200 caracteres; vacía → null.
const descriptionSchema = z
  .string()
  .trim()
  .max(200, 'La descripción no puede superar los 200 caracteres')
  .nullable()
  .transform((value) => (value ? value : null));

const createExpenseSchema = z.object({
  paidById: idSchema('Quién pagó'),
  amount: moneySchema,
  date: dateSchema,
  description: descriptionSchema.optional(),
});

const updateExpenseSchema = z
  .object({
    categoryId: idSchema('La categoría').optional(),
    paidById: idSchema('Quién pagó').optional(),
    amount: moneySchema.optional(),
    date: dateSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Indicá al menos un dato para modificar',
    path: ['_'],
  });

module.exports = { moneySchema, createExpenseSchema, updateExpenseSchema };
