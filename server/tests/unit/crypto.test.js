const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../../src/lib/passwords');
const { signToken } = require('../../src/lib/tokens');

describe('passwords', () => {
  test('genera un hash bcrypt y lo verifica', async () => {
    const hash = await hashPassword('secreta123');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('secreta123');
    await expect(verifyPassword('secreta123', hash)).resolves.toBe(true);
    await expect(verifyPassword('otra-clave', hash)).resolves.toBe(false);
  });
});

describe('signToken', () => {
  test('emite un JWT HS256 con sub = id y 7 días de vigencia', () => {
    const token = signToken('11111111-1111-1111-1111-111111111111');
    const { header, payload } = jwt.decode(token, { complete: true });
    expect(header.alg).toBe('HS256');
    expect(payload.sub).toBe('11111111-1111-1111-1111-111111111111');
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe('verifyToken', () => {
  const { verifyToken } = require('../../src/lib/tokens');
  const userId = '11111111-1111-1111-1111-111111111111';

  test('acepta un token válido', () => {
    expect(verifyToken(signToken(userId)).sub).toBe(userId);
  });

  test('rechaza un token con la firma alterada', () => {
    // Se altera un carácter del medio de la firma (el último puede llevar solo bits de relleno).
    const token = signToken(userId);
    const i = token.length - 10;
    const tampered = token.slice(0, i) + (token[i] === 'A' ? 'B' : 'A') + token.slice(i + 1);
    expect(() => verifyToken(tampered)).toThrow();
  });

  test('rechaza un token vencido', () => {
    const expired = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    });
    expect(() => verifyToken(expired)).toThrow();
  });

  test('rechaza un token firmado con otro secreto', () => {
    const other = jwt.sign({ sub: userId }, 'otro-secreto-de-al-menos-32-caracteres!!', {
      algorithm: 'HS256',
    });
    expect(() => verifyToken(other)).toThrow();
  });

  test('rechaza un token sin firma (alg: none)', () => {
    const unsigned = jwt.sign({ sub: userId }, null, { algorithm: 'none' });
    expect(() => verifyToken(unsigned)).toThrow();
  });
});
