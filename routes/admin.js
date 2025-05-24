// backend/routes/admin.js
const express = require('express');
const router = express.Router();

// Example route
router.get('/', (req, res) => {
    res.json({ message: 'Admin route' });
});

module.exports = router;
