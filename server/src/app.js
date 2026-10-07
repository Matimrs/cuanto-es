const express = require('express');
const authRoutes = require('./routes/auth.routes');
const { router: groupsRoutes } = require('./routes/groups.routes');
const HttpError = require('./lib/httpError');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/auth', authRoutes);
  app.use('/groups', groupsRoutes);

  app.use((req, res, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado'));
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
