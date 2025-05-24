const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /register - Create a new user
router.post("/register", register);

// POST /login - Authenticate user
router.post("/login", login);

module.exports = router;
