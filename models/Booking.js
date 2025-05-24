const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId, // ✅ CORRECT
        ref: 'Doctor',
        required: true
    },
    name: String,
    email: String,
    phone: String,
    date: String,
    time: String,
    isVisit: Boolean
});

module.exports = mongoose.model('Appointment', appointmentSchema);
