const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: Number,
    phone: String,
    specialization: String,
    experience: Number,
    image: String, // store the image filename or URL
});

module.exports = mongoose.model('Doctor', doctorSchema);
