const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId, // ✅ CORRECT
        ref: 'Doctor',
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Availability', availabilitySchema);
