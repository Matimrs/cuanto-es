const { z } = require('zod');
const { requiredText } = require('./groups.schemas');
const { isUuid } = require('../lib/ids');

const idSchema = (label) => z.string({ error: `${label} es obligatorio` }).refine(isUuid, `${label} no es válido`);

// FR-013 / FR-015: nombre de 1 a 100 caracteres; participantes opcionales (por defecto, todos).
const createCategorySchema = z.object({
  name: requiredText('El nombre'),
  participantIds: z
    .array(idSchema('El participante'), { error: 'Indicá la lista de participantes' })
    .min(1, 'La categoría tiene que tener al menos un participante')
    .refine((ids) => new Set(ids).size === ids.length, 'Hay participantes repetidos')
    .optional(),
});

const renameCategorySchema = z.object({ name: requiredText('El nombre') });

const addParticipantSchema = z.object({ memberId: idSchema('El miembro') });

module.exports = { idSchema, createCategorySchema, renameCategorySchema, addParticipantSchema };
