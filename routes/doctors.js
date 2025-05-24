// routes/doctors.js
const express = require('express');
const router = express.Router();

// Define the routes for doctors (example)
router.get('/', (req, res) => {
    res.json({ message: 'List of doctors' });
});

module.exports = router;
