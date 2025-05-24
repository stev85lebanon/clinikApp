const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Middleware and Routes
const authenticateJWT = require('./middleware/authenticateJWT');
const requireAdmin = require('./middleware/requireAdmin');
const appointmentsRouter = require('./routes/appointments'); // Correctly import the routes file
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const availabilityRoutes = require('./routes/availability');
const adminRoutes = require('./routes/admin');

// Initialize Express
const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Update this if your frontend is on a different port or domain
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', authenticateJWT, appointmentsRouter);
app.use('/api/doctors', authenticateJWT, doctorRoutes);
app.use('/api/availability', authenticateJWT, availabilityRoutes);
app.use('/api/admin', authenticateJWT, requireAdmin, adminRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit the process if the connection fails
    });

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
