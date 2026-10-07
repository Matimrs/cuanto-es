const { registerSchema, loginSchema } = require('../../src/schemas/auth.schemas');

const valid = { name: 'Ana', email: 'ana@ejemplo.com', password: 'secreta123' };

function fieldErrors(result) {
  return result.error.issues.map((issue) => issue.path[0]);
}

describe('registerSchema', () => {
  test('normaliza el email (trim + minúsculas)', () => {
    const result = registerSchema.safeParse({ ...valid, email: '  ANA@Ejemplo.com ' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('ana@ejemplo.com');
  });

  test('rechaza un email mal formado', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'no-es-un-email' });
    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toContain('email');
  });

  test('recorta el nombre y exige entre 1 y 100 caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, name: '  Ana  ' }).data.name).toBe('Ana');
    expect(registerSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  test('exige los tres campos', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  test('la contraseña tiene un mínimo de 8 caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'corta' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: '12345678' }).success).toBe(true);
  });

  test('el mínimo se cuenta en caracteres Unicode, no en unidades UTF-16', () => {
    // 4 emojis: length 8 en UTF-16, pero solo 4 caracteres → se rechaza por corta
    expect(registerSchema.safeParse({ ...valid, password: '😀'.repeat(4) }).success).toBe(false);
    // 8 caracteres de 2 bytes → se acepta
    expect(registerSchema.safeParse({ ...valid, password: 'ñ'.repeat(8) }).success).toBe(true);
  });

  test('rechaza contraseñas de más de 72 bytes en UTF-8', () => {
    // 25 caracteres de 3 bytes = 75 bytes
    expect(registerSchema.safeParse({ ...valid, password: '€'.repeat(25) }).success).toBe(false);
    // 24 caracteres de 3 bytes = 72 bytes
    expect(registerSchema.safeParse({ ...valid, password: '€'.repeat(24) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(73) }).success).toBe(false);
  });

  test('no recorta ni normaliza la contraseña', () => {
    const password = '  contraseña con espacios ñ ';
    expect(registerSchema.safeParse({ ...valid, password }).data.password).toBe(password);
  });

  test('descarta los campos que el cliente no puede fijar', () => {
    const result = registerSchema.safeParse({
      ...valid,
      id: '00000000-0000-0000-0000-000000000000',
      passwordHash: 'x',
      createdAt: '2020-01-01',
    });
    expect(result.success).toBe(true);
    expect(Object.keys(result.data).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('loginSchema', () => {
  test('normaliza el email', () => {
    const result = loginSchema.safeParse({ email: '  ANA@Ejemplo.com ', password: 'x' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('ana@ejemplo.com');
  });

  test('exige una contraseña no vacía', () => {
    const result = loginSchema.safeParse({ email: 'ana@ejemplo.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path[0]).toBe('password');
  });

  test('no aplica la política de 8 caracteres (eso da 401, no 400)', () => {
    expect(loginSchema.safeParse({ email: 'ana@ejemplo.com', password: 'corta' }).success).toBe(true);
  });

  test('descarta campos desconocidos', () => {
    const result = loginSchema.safeParse({ email: 'ana@ejemplo.com', password: 'x', admin: true });
    expect(Object.keys(result.data).sort()).toEqual(['email', 'password']);
  });
});
