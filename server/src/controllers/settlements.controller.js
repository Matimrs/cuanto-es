// US4 / US5 — Liquidaciones (FR-021 a FR-028a).
const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { decimalToCents, centsToDecimalString } = require('../lib/money');
const { forbidden } = require('../middleware/loadGroup');
const {
  withGroupLock,
  recalculatePending,
  getSettlementsView,
} = require('../services/settlements.service');

// US4: pendientes, pagadas y saldos. Solo lee: las pendientes se recalculan al cambiar algo
// (FR-027), nunca al consultarlas.
async function getView(req, res) {
  res.json(await getSettlementsView(prisma, req.group.id));
}

function invalid(field, message) {
  return new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', { [field]: message });
}

// FR-028: solo el deudor o el acreedor (si tienen cuenta) o el dueño del grupo.
function assertCanMark(req, settlement) {
  if (req.role === 'owner') return;
  const memberId = req.membership?.id;
  if (memberId !== settlement.debtorId && memberId !== settlement.creditorId) throw forbidden();
}

// US5: { paid: true, amount? } registra un pago total o parcial sobre una pendiente;
// { paid: false } anula un pago. En ambos casos se recalculan las pendientes (research R6).
async function update(req, res) {
  const groupId = req.group.id;
  const { paid, amount } = req.body;

  const view = await withGroupLock(groupId, async (tx) => {
    const settlement = await tx.settlement.findFirst({ where: { id: req.params.settlementId, groupId } });
    // El usuario tiene acceso al grupo (loadGroup): un id que no está entre las vigentes es una
    // pendiente que un recálculo reemplazó (FR-027c).
    if (!settlement) {
      throw new HttpError(409, 'SETTLEMENT_CHANGED', 'Las liquidaciones cambiaron. Volvé a consultarlas.');
    }
    assertCanMark(req, settlement);

    if (paid) {
      if (settlement.paid) {
        throw new HttpError(409, 'SETTLEMENT_ALREADY_PAID', 'Esa liquidación ya está pagada');
      }
      const total = decimalToCents(settlement.amount);
      const cents = amount ?? total;
      if (cents > total) throw invalid('amount', 'El pago no puede superar el monto de la liquidación');

      await tx.settlement.update({
        where: { id: settlement.id },
        data: {
          paid: true,
          amount: centsToDecimalString(cents),
          paidAt: new Date(),
          paidById: req.user.id,
        },
      });
    } else {
      if (!settlement.paid) throw invalid('paid', 'Esa liquidación no tiene un pago registrado');
      await tx.settlement.delete({ where: { id: settlement.id } });
    }

    await recalculatePending(tx, groupId);
    return getSettlementsView(tx, groupId);
  });

  res.json(view);
}

module.exports = { getView, update };
