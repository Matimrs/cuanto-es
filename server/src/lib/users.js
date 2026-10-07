// Vista pública del usuario: nunca incluye el hash de la contraseña.
function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

module.exports = { toPublicUser };
