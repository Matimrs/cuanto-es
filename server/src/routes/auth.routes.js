const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/requireAuth');
const { registerSchema, loginSchema } = require('../schemas/auth.schemas');
const { register, login, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

module.exports = router;
