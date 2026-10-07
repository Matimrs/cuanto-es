const { z } = require('zod');
const { moneySchema } = require('./expenses.schemas');

// FR-028 / FR-028a: { paid: true, amount? } registra un pago (por defecto, el total);
// { paid: false } anula un pago registrado.
const updateSettlementSchema = z
  .object({
    paid: z.boolean({ error: 'Indicá si está pagada' }),
    amount: moneySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paid === false && data.amount !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'El monto solo se indica al registrar un pago',
      });
    }
  });

module.exports = { updateSettlementSchema };
