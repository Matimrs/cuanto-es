let config;
try {
  config = require('./config');
} catch (err) {
  // FR-025: sin configuración obligatoria el servicio no arranca y dice qué clave falta.
  console.error(err.message);
  process.exit(1);
}

const { createApp } = require('./app');

const app = createApp();

app.listen(config.port, () => {
  console.log(`API de CuantoEs escuchando en el puerto ${config.port}`);
});
