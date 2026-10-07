const { Prisma } = require('@prisma/client');
const {
  parseMoney,
  formatMoney,
  decimalToCents,
  centsToDecimalString,
} = require('../../src/lib/money');

describe('parseMoney', () => {
  test.each([
    ['15000.50', 1500050],
    ['15000.5', 1500050],
    ['300', 30000],
    ['0.01', 1],
    [300, 30000],
    [15000.5, 1500050],
    [0.1, 10],
    ['9999999999.99', 999999999999],
  ])('%p → %p centavos', (input, cents) => {
    expect(parseMoney(input)).toBe(cents);
  });

  test.each([
    '1.234',
    0.001,
    '-5',
    -5,
    'abc',
    '',
    ' 5',
    '1e3',
    1e21,
    '10000000000.00',
    NaN,
    Infinity,
    null,
    undefined,
    {},
  ])('rechaza %p', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});

describe('formatMoney', () => {
  test.each([
    [1500050, '15000.50'],
    [5, '0.05'],
    [0, '0.00'],
    [-4000, '-40.00'],
    [-5, '-0.05'],
  ])('%p → %p', (cents, text) => {
    expect(formatMoney(cents)).toBe(text);
  });
});

describe('conversión con Decimal de Prisma', () => {
  test('decimalToCents', () => {
    expect(decimalToCents(new Prisma.Decimal('1234.56'))).toBe(123456);
    expect(decimalToCents(new Prisma.Decimal('0.1'))).toBe(10);
    expect(decimalToCents(null)).toBe(0);
  });

  test('centsToDecimalString', () => {
    expect(centsToDecimalString(123456)).toBe('1234.56');
  });
});
