// Montos en ARS: la API usa strings decimales ("15000.50") y el cálculo, centavos enteros.
// Nunca se convierte un monto con parseFloat (Principio I: sin residuos de punto flotante).

const MONEY_RE = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/** Convierte un monto de la API (string o número) a centavos enteros, o null si es inválido. */
function parseMoney(value) {
  let text;
  if (typeof value === 'string') text = value;
  else if (typeof value === 'number' && Number.isFinite(value)) text = String(value);
  else return null;

  const match = MONEY_RE.exec(text);
  if (!match) return null;
  const [, units, decimals = ''] = match;
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** Centavos enteros → "15000.50" (con signo si es negativo). */
function formatMoney(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Decimal de Prisma (o null) → centavos enteros. */
function decimalToCents(decimal) {
  if (decimal === null || decimal === undefined) return 0;
  const text = decimal.toFixed(2);
  const negative = text.startsWith('-');
  const [units, decimals] = text.replace('-', '').split('.');
  const cents = Number(units) * 100 + Number(decimals);
  return negative ? -cents : cents;
}

/** Centavos enteros → string decimal para escribir en una columna DECIMAL(12,2). */
function centsToDecimalString(cents) {
  return formatMoney(cents);
}

module.exports = { parseMoney, formatMoney, decimalToCents, centsToDecimalString };
