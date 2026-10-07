// Adaptador del cálculo de liquidaciones (specs/002-groups-expenses-settlements, research R1–R4).
//
// Reutiliza SIN CAMBIOS el algoritmo del cliente (Principio I): Category.distribute() reparte
// cada categoría y calculate() unifica pagos y elimina cadenas. Acá solo se adapta la entrada:
//   - Cada participante entra con su saldo neto en centavos enteros (pagado − parte), donde la
//     parte sigue FR-024a. Así el promedio de cada categoría es exactamente 0 y todo es entero.
//   - Cada pago ya realizado entra como una categoría ficticia de dos personas que "devuelve"
//     lo pagado; la unificación de pagos lo compensa contra la deuda (FR-027a).
// Es JavaScript puro: no conoce Prisma ni Express.

const Category = require('../../../src/classes/Category.js').default;
const { calculate } = require('../../../src/utils/calculate.js');

/**
 * Parte de cada participante en centavos (FR-024a): el total dividido por la cantidad de
 * participantes, redondeado hacia abajo; los centavos sobrantes se suman a la parte de quien más
 * pagó (con empate, el primero en orden de alta).
 * @param {{ memberId: string, paidCents: number }[]} participants en orden de alta
 * @returns {number[]} partes, en el mismo orden
 */
function computeShares(participants) {
  const n = participants.length;
  if (n === 0) return [];
  const total = participants.reduce((sum, p) => sum + p.paidCents, 0);
  const base = Math.floor(total / n);
  const rest = total - base * n;

  let top = 0;
  participants.forEach((p, i) => {
    if (p.paidCents > participants[top].paidCents) top = i;
  });
  return participants.map((_, i) => (i === top ? base + rest : base));
}

function toCategoryOfNets(id, nets /* [{ memberId, cents }] */) {
  const category = new Category([], id, id);
  for (const { memberId, cents } of nets) category.addPerson({ id: memberId, name: memberId }, cents);
  return category;
}

/**
 * Transferencias pendientes del grupo.
 * @param {{
 *   categories: { id: string, participants: { memberId: string, paidCents: number }[] }[],
 *   payments: { debtorId: string, creditorId: string, cents: number }[],
 * }} input categorías, participantes y pagos ya ordenados (research R4)
 * @returns {{ debtorId: string, creditorId: string, cents: number }[]}
 */
function computeSettlements({ categories, payments }) {
  const input = [];

  for (const category of categories) {
    if (category.participants.length < 2) continue;
    const shares = computeShares(category.participants);
    input.push(
      toCategoryOfNets(
        category.id,
        category.participants.map((p, i) => ({ memberId: p.memberId, cents: p.paidCents - shares[i] })),
      ),
    );
  }

  payments.forEach((payment, i) => {
    input.push(
      toCategoryOfNets(`pago-${i}`, [
        { memberId: payment.debtorId, cents: payment.cents },
        { memberId: payment.creditorId, cents: -payment.cents },
      ]),
    );
  });

  return calculate(input)
    .map((peer) => ({ debtorId: peer.debtor.id, creditorId: peer.creditor.id, cents: peer.amount }))
    .filter((transfer) => {
      if (!Number.isInteger(transfer.cents)) {
        throw new Error(`El cálculo produjo un monto no entero: ${transfer.cents}`);
      }
      return transfer.cents > 0;
    });
}

/**
 * Saldo de cada miembro (FR-027b), en centavos. pendingNet > 0: le deben; < 0: debe.
 * pendingNet = aportado − parte + pagos enviados − pagos recibidos.
 */
function computeBalances({ categories, payments, memberIds }) {
  const balances = new Map(
    memberIds.map((memberId) => [
      memberId,
      { memberId, contributed: 0, share: 0, paymentsSent: 0, paymentsReceived: 0, pendingNet: 0 },
    ]),
  );
  const get = (memberId) => {
    if (!balances.has(memberId)) {
      balances.set(memberId, {
        memberId,
        contributed: 0,
        share: 0,
        paymentsSent: 0,
        paymentsReceived: 0,
        pendingNet: 0,
      });
    }
    return balances.get(memberId);
  };

  for (const category of categories) {
    const shares = computeShares(category.participants);
    category.participants.forEach((p, i) => {
      const b = get(p.memberId);
      b.contributed += p.paidCents;
      b.share += shares[i];
    });
  }
  for (const payment of payments) {
    get(payment.debtorId).paymentsSent += payment.cents;
    get(payment.creditorId).paymentsReceived += payment.cents;
  }

  return [...balances.values()].map((b) => ({
    ...b,
    pendingNet: b.contributed - b.share + b.paymentsSent - b.paymentsReceived,
  }));
}

module.exports = { computeShares, computeSettlements, computeBalances };
