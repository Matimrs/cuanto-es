const jwt = require('jsonwebtoken');
const config = require('../config');

const ALGORITHM = 'HS256';

// JWT HS256 con sub = id del usuario y 7 días de vigencia (research R5, FR-009).
function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { algorithm: ALGORITHM, expiresIn: '7d' });
}

// Fija el algoritmo para evitar `alg: none` y la confusión de algoritmos. Lanza si el token
// está alterado, vencido o firmado con otro secreto.
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
}

module.exports = { signToken, verifyToken };
