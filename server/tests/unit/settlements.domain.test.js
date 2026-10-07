// Adaptador del cálculo (research R1–R4): reutiliza calculate() y Category.distribute() del
// cliente sin cambiarlos. Cubre los escenarios de la spec, la equivalencia con la app (SC-001),
// la regla del centavo sobrante (FR-024a), los pagos como entrada (FR-027a), el determinismo
// (FR-025) y las invariantes del Principio I sobre grupos aleatorios (SC-002, SC-007).
const Category = require('../../../src/classes/Category.js').default;
const { calculate } = require('../../../src/utils/calculate.js');
const {
  computeShares,
  computeSettlements,
  computeBalances,
} = require('../../src/domain/settlements');

// Helpers ------------------------------------------------------------------------------------

const cat = (id, paid /* { memberId: cents } en orden de alta */) => ({
  id,
  participants: Object.entries(paid).map(([memberId, paidCents]) => ({ memberId, paidCents })),
});
const pay = (debtorId, creditorId, cents) => ({ debtorId, creditorId, cents });
const fmt = (transfers) => transfers.map((t) => `${t.debtorId}→${t.creditorId} ${t.cents}`);

// Neto que debe dejar el resultado en cada miembro: lo que recibe menos lo que paga.
function netOfTransfers(transfers) {
  const net = {};
  for (const t of transfers) {
    net[t.creditorId] = (net[t.creditorId] || 0) + t.cents;
    net[t.debtorId] = (net[t.debtorId] || 0) - t.cents;
  }
  return net;
}

function expectNetsMatchBalances(input, transfers) {
  const memberIds = [
    ...new Set([
      ...input.categories.flatMap((c) => c.participants.map((p) => p.memberId)),
      ...input.payments.flatMap((p) => [p.debtorId, p.creditorId]),
    ]),
  ];
  const balances = computeBalances({ ...input, memberIds });
  const net = netOfTransfers(transfers);
  for (const b of balances) expect(net[b.memberId] || 0).toBe(b.pendingNet);
  expect(balances.reduce((s, b) => s + b.pendingNet, 0)).toBe(0);
}

// La app: montos en pesos (float), sin la regla del centavo; el mismo calculate().
function appResult(categories) {
  const cats = categories.map((c) => {
    const category = new Category([], c.id, c.id);
    for (const p of c.participants) category.addPerson({ id: p.memberId, name: p.memberId }, p.paidCents / 100);
    return category;
  });
  return calculate(cats)
    .map((p) => ({ debtorId: p.debtor.id, creditorId: p.creditor.id, cents: Math.round(p.amount * 100) }))
    .filter((t) => t.cents > 0);
}

// (a) Escenarios de la spec --------------------------------------------------------------------

describe('computeShares (FR-024a)', () => {
  test('reparte en centavos y el sobrante lo absorbe quien más pagó', () => {
    const shares = computeShares([
      { memberId: 'Ana', paidCents: 10000 },
      { memberId: 'Beto', paidCents: 0 },
      { memberId: 'Dani', paidCents: 0 },
    ]);
    expect(shares).toEqual([3334, 3333, 3333]);
  });

  test('con empate en lo pagado, el sobrante es del primero en orden de alta', () => {
    const shares = computeShares([
      { memberId: 'A', paidCents: 0 },
      { memberId: 'B', paidCents: 50 },
      { memberId: 'C', paidCents: 50 },
    ]);
    expect(shares).toEqual([33, 34, 33]);
  });

  test('todos los centavos sobrantes van a la misma persona', () => {
    // 2 centavos entre 3: la parte base es 0 y quien más pagó absorbe los 2
    const shares = computeShares([
      { memberId: 'A', paidCents: 2 },
      { memberId: 'B', paidCents: 0 },
      { memberId: 'C', paidCents: 0 },
    ]);
    expect(shares).toEqual([2, 0, 0]);
    expect(shares.reduce((s, x) => s + x, 0)).toBe(2);
  });
});

describe('computeSettlements: escenarios de la spec', () => {
  test('US4-1: 300 entre Ana, Beto y Dani', () => {
    const result = computeSettlements({
      categories: [cat('nafta', { Ana: 30000, Beto: 0, Dani: 0 })],
      payments: [],
    });
    expect(fmt(result)).toEqual(['Beto→Ana 10000', 'Dani→Ana 10000']);
  });

  test('US4-2: unificación de pagos entre dos categorías', () => {
    const input = {
      categories: [cat('c1', { Ana: 0, Beto: 10000 }), cat('c2', { Ana: 3000, Beto: 0 })],
      payments: [],
    };
    // c1: Ana le debe 50 a Beto; c2: Beto le debe 15 a Ana → una sola transferencia de 35
    expect(fmt(computeSettlements(input))).toEqual(['Ana→Beto 3500']);
  });

  test('US4-3: elimina la cadena sin cambiar los saldos', () => {
    const input = {
      categories: [cat('c1', { Ana: 0, Beto: 2000 }), cat('c2', { Beto: 0, Carla: 4000 })],
      payments: [],
    };
    const result = computeSettlements(input);
    // Ana le debe 10 a Beto y Beto le debe 20 a Carla: nadie debe y a la vez cobra
    const debtors = new Set(result.map((t) => t.debtorId));
    expect(result.some((t) => debtors.has(t.creditorId))).toBe(false);
    expectNetsMatchBalances(input, result);
  });

  test('US4-4: 100 entre 3 → 33,33 y 33,33; Ana absorbe el centavo', () => {
    const result = computeSettlements({
      categories: [cat('n', { Ana: 10000, Beto: 0, Dani: 0 })],
      payments: [],
    });
    expect(fmt(result)).toEqual(['Beto→Ana 3333', 'Dani→Ana 3333']);
  });

  test.each([
    ['todos pagaron lo mismo', [cat('n', { A: 500, B: 500, C: 500 })]],
    ['sin gastos', [cat('n', { A: 0, B: 0 })]],
    ['un solo participante', [cat('n', { A: 9999 })]],
    ['sin categorías', []],
  ])('US4-5: %s → sin transferencias', (_caso, categories) => {
    expect(computeSettlements({ categories, payments: [] })).toEqual([]);
  });

  test('FR-015b: un participante que no pagó nada igual paga su parte', () => {
    const result = computeSettlements({
      categories: [cat('n', { Ana: 20000, Beto: 0 })],
      payments: [],
    });
    expect(fmt(result)).toEqual(['Beto→Ana 10000']);
  });

  test('US4-7: un pago ya hecho se descuenta y queda solo lo que falta', () => {
    // Beto debe 150 en total y ya pagó 100
    const input = {
      categories: [cat('n', { Ana: 30000, Beto: 0 })],
      payments: [pay('Beto', 'Ana', 10000)],
    };
    expect(fmt(computeSettlements(input))).toEqual(['Beto→Ana 5000']);
  });

  test('US4-8: si se pagó de más, la diferencia vuelve al que pagó', () => {
    // Beto debía 60 y había pagado 100: Ana le devuelve 40
    const input = {
      categories: [cat('n', { Ana: 12000, Beto: 0 })],
      payments: [pay('Beto', 'Ana', 10000)],
    };
    expect(fmt(computeSettlements(input))).toEqual(['Ana→Beto 4000']);
  });

  test('US4-8 con un tercero: el excedente puede redirigirse, sin cambiar saldos', () => {
    const input = {
      categories: [cat('n', { Ana: 30000, Beto: 0, Dani: 0 })],
      payments: [pay('Beto', 'Ana', 14000)],
    };
    const result = computeSettlements(input);
    expectNetsMatchBalances(input, result);
    expect(netOfTransfers(result).Beto).toBe(4000);
  });
});

// (b) Equivalencia con la app (SC-001) --------------------------------------------------------

const REFERENCE_SCENARIOS = [
  ['un participante', [cat('a', { A: 12345 })]],
  ['gastos iguales', [cat('a', { A: 1000, B: 1000, C: 1000 })]],
  ['100 entre 3', [cat('a', { A: 10000, B: 0, C: 0 })]],
  ['1 entre 7', [cat('a', { A: 100, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 })]],
  ['un pagador entre 5', [cat('a', { A: 0, B: 0, C: 50000, D: 0, E: 0 })]],
  ['dos acreedores y dos deudores', [cat('a', { A: 6000, B: 4000, C: 1000, D: 0 })]],
  ['miembros en varias categorías', [cat('a', { A: 9000, B: 0, C: 0 }), cat('b', { B: 4000, C: 0 })]],
  ['unificación en ambos sentidos', [cat('a', { A: 10000, B: 0 }), cat('b', { A: 0, B: 4000 })]],
  ['cadena de 3', [cat('a', { A: 0, B: 2000 }), cat('b', { B: 0, C: 6000 })]],
  [
    'cadena de 4',
    [cat('a', { A: 0, B: 2000 }), cat('b', { B: 0, C: 6000 }), cat('c', { C: 0, D: 10000 })],
  ],
  ['invitados y montos con centavos', [cat('a', { ana: 123456, invitadoDani: 789, beto: 0 })]],
  [
    'grupo mixto',
    [
      cat('nafta', { A: 25050, B: 0, C: 10000 }),
      cat('super', { A: 0, B: 31275, C: 4425, D: 0 }),
      cat('cena', { C: 9000, D: 0 }),
    ],
  ],
];

describe('equivalencia con la app (SC-001, FR-022)', () => {
  test.each(REFERENCE_SCENARIOS)('%s', (_name, categories) => {
    const ours = computeSettlements({ categories, payments: [] });
    const app = appResult(categories);

    // Las mismas transferencias entre las mismas personas, en el mismo orden...
    expect(ours.map((t) => `${t.debtorId}→${t.creditorId}`)).toEqual(
      app.map((t) => `${t.debtorId}→${t.creditorId}`),
    );
    // ...con los montos de la app redondeados a centavos. La única diferencia admitida es la
    // del centavo sobrante que FR-024a le asigna a quien más pagó (≤ 1 centavo por transferencia).
    ours.forEach((t, i) => expect(Math.abs(t.cents - app[i].cents)).toBeLessThanOrEqual(1));
  });
});

// (c) Propiedades sobre grupos aleatorios -----------------------------------------------------

function randomGroups(count, seed) {
  let s = seed;
  const rnd = (n) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s % n;
  };
  const groups = [];
  for (let g = 0; g < count; g += 1) {
    const members = Array.from({ length: 2 + rnd(7) }, (_, i) => `m${i}`);
    const categories = [];
    for (let k = 0; k < 1 + rnd(4); k += 1) {
      const ps = members.filter(() => rnd(3) > 0);
      if (ps.length > 0) {
        categories.push({
          id: `k${k}`,
          participants: ps.map((memberId) => ({
            memberId,
            paidCents: rnd(4) === 0 ? 0 : rnd(5000000),
          })),
        });
      }
    }
    const payments = [];
    for (let q = 0; q < rnd(4); q += 1) {
      const d = members[rnd(members.length)];
      const c = members[rnd(members.length)];
      if (d !== c) payments.push(pay(d, c, 1 + rnd(2000000)));
    }
    groups.push({ categories, payments });
  }
  return groups;
}

describe('propiedades (Principio I, SC-002, SC-007)', () => {
  const groups = randomGroups(2500, 20261007);

  test('termina, montos enteros positivos y sin deudor = acreedor', () => {
    for (const input of groups) {
      for (const t of computeSettlements(input)) {
        expect(Number.isInteger(t.cents)).toBe(true);
        expect(t.cents).toBeGreaterThan(0);
        expect(t.debtorId).not.toBe(t.creditorId);
      }
    }
  });

  test('cada miembro queda exactamente con su saldo neto, contando los pagos', () => {
    for (const input of groups) expectNetsMatchBalances(input, computeSettlements(input));
  });

  test('no quedan cadenas: nadie paga y cobra a la vez', () => {
    for (const input of groups) {
      const result = computeSettlements(input);
      const debtors = new Set(result.map((t) => t.debtorId));
      expect(result.filter((t) => debtors.has(t.creditorId))).toEqual([]);
    }
  });
});

// (d) Determinismo y (e) saldos ---------------------------------------------------------------

describe('determinismo (FR-025)', () => {
  test('la misma entrada da siempre el mismo resultado', () => {
    for (const input of randomGroups(200, 7)) {
      expect(computeSettlements(input)).toEqual(computeSettlements(input));
    }
  });
});

describe('computeBalances (FR-027b)', () => {
  test('aportado, parte, pagos enviados y recibidos, y lo que falta', () => {
    const balances = computeBalances({
      categories: [cat('n', { Ana: 30000, Beto: 0, Dani: 0 })],
      payments: [pay('Beto', 'Ana', 6000)],
      memberIds: ['Ana', 'Beto', 'Dani', 'Eva'],
    });
    expect(balances).toEqual([
      { memberId: 'Ana', contributed: 30000, share: 10000, paymentsSent: 0, paymentsReceived: 6000, pendingNet: 14000 },
      { memberId: 'Beto', contributed: 0, share: 10000, paymentsSent: 6000, paymentsReceived: 0, pendingNet: -4000 },
      { memberId: 'Dani', contributed: 0, share: 10000, paymentsSent: 0, paymentsReceived: 0, pendingNet: -10000 },
      { memberId: 'Eva', contributed: 0, share: 0, paymentsSent: 0, paymentsReceived: 0, pendingNet: 0 },
    ]);
  });
});
