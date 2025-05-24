const express = require('express');
const router = express.Router();

// Example route for availability
router.get('/', (req, res) => {
    res.json({ message: 'Doctor availability' });
});

module.exports = router;
