const { z } = require('zod');
const { emailSchema } = require('./auth.schemas');
const { requiredText } = require('./groups.schemas');

const aliasSchema = requiredText('El alias');

// FR-008 / FR-009: un usuario registrado por email o un invitado por alias, nunca ambos.
const addMemberSchema = z
  .object({ email: emailSchema.optional(), alias: aliasSchema.optional() })
  .superRefine((data, ctx) => {
    if ((data.email === undefined) === (data.alias === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Indicá un email o un alias, no ambos' });
    }
  });

const updateAliasSchema = z.object({ alias: aliasSchema });

module.exports = { addMemberSchema, updateAliasSchema };
