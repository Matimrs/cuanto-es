const bcrypt = require('bcryptjs');
const config = require('../config');

// bcrypt (research R4). La contraseña en claro nunca se guarda ni se registra (FR-005).
function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcryptRounds);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
