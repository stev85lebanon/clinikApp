// routes/appointments.js
const express = require('express');
const router = express.Router();

// Ensure you are importing your handler correctly
// Example of how to define a handler function
const getAppointmentsHandler = (req, res) => {
    res.json({ message: "Appointments fetched successfully" });
};

// Ensure your route handler is a function
router.get('/', getAppointmentsHandler);

module.exports = router;
