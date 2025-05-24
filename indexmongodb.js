const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db'); // Adjust path as needed
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Availability = require('./models/availability');
const Booking = require('./models/Booking');
const Stripe = require('stripe');
const twilio = require('twilio');


const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // ✅ Use environment variable
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


const User = require('./models/User');
const multer = require('multer');
const path = require('path');
const Doctor = require('./models/Doctor');
const app = express();
// app.use(cors());

app.use(cors({
    origin: 'https://clinic-web-app.vercel.app/',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

// Connect to MongoDB
connectDB()

const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(403).json({ success: false, message: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Invalid token" });
        req.user = user;
        next();
    });
};
//Middleware for admin
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    User.findOne({ username: req.user.username }).then(user => {
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    });
};
// POST /register - Create a new user
app.post("/register", async (req, res) => {
    const { username, password, isDoctor = false } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, isDoctor });
    await newUser.save();

    res.status(201).json({ success: true, message: "User created successfully" });
});
// POST /login - Authenticate user
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const doctor = await Doctor.findOne({ name: username }); // Assumes doctor's name matches user's username

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({
        success: true,
        token,
        user: {
            username: user.username,
            isAdmin: user.isAdmin,
            isDoctor: Boolean(doctor),

        }
    });


});
// Get / admin 
app.get('/admin/stats', authenticateJWT, requireAdmin, async (req, res) => {
    const users = await User.countDocuments();
    const bookings = await Booking.countDocuments();
    const slots = await Availability.countDocuments({ isBooked: false });

    res.json({ users, bookings, slots });
});
app.get('/appointments', authenticateJWT, async (req, res) => {
    try {
        const user = req.user;
        const { date } = req.query;

        let bookings;

        const dbUser = await User.findOne({ username: user.username });

        const query = {};

        if (!dbUser?.isAdmin) {
            query.email = user.username + "@example.com"; // adjust if needed
        }

        if (date) {
            query.date = date;
        }

        bookings = await Booking.find(query);

        res.json(bookings);
    } catch (err) {
        console.error("Error fetching appointments:", err);
        res.status(500).json({ message: "Server error" });
    }
});
// GET /doctors 
app.get('/doctors', authenticateJWT, async (req, res) => {
    try {
        const doctors = await Doctor.find();

        // Normalize _id to id so frontend can match
        const mappedDoctors = doctors.map(doc => ({
            id: doc._id.toString(),
            name: doc.name,
            age: doc.age,
            phone: doc.phone,
            specialization: doc.specialization,
            experience: doc.experience,
            image: doc.image
        }));

        res.json(mappedDoctors);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ message: 'Error fetching doctors from database' });
    }
});
// Example: /routes/appointments.js
app.get('/doctor-appointments', authenticateJWT, async (req, res) => {
    try {
        const doctorName = req.user.username; // ensure your JWT payload includes the name

        const doctor = await Doctor.findOne({ name: doctorName });

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        const appointments = await Booking.find({ doctorId: doctor._id }).sort({ date: 1, time: 1 });

        res.json(appointments);
    } catch (err) {
        console.error("Failed to get appointments:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
app.delete('/cancel-appointment/:id', authenticateJWT, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        await Booking.findByIdAndDelete(appointmentId);

        res.status(200).json({ message: 'Appointment canceled successfully' }); // ✅ Proper success response
    } catch (error) {
        console.error('Error canceling appointment:', error);
        res.status(500).json({ message: 'Internal server error' }); // ✅ Proper error
    }
});
// GET /availability - protected
const generateTimeSlots = (startHour = 9, endHour = 14) => {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        slots.push(time);
    }
    return slots;
};
const generateDates = (daysAhead = 7) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < daysAhead; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        dates.push(dateStr);
    }
    return dates;
};
// Dynamically generate availability for each doctor
app.get('/availability', authenticateJWT, async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        return res.status(400).json({ message: 'Missing doctorId or date' });
    }

    const slots = await Availability.find({
        doctorId,
        date,
        isBooked: false
    }).select('time -_id');

    const times = slots.map(slot => slot.time);
    res.json(times);
});
app.post('/seed-availability', async (req, res) => {
    try {
        const doctors = await Doctor.find(); // ✅ Get real MongoDB _ids
        const dates = generateDates(30);
        const timeSlots = generateTimeSlots(9, 17); // 9 AM to 4 PM

        const slots = [];

        for (const doctor of doctors) {
            for (const date of dates) {
                for (const time of timeSlots) {
                    slots.push({
                        doctorId: doctor._id, // ✅ Use MongoDB ObjectId
                        date,
                        time,
                        isBooked: false
                    });
                }
            }
        }

        await Availability.deleteMany({});
        await Availability.insertMany(slots);

        res.json({ message: 'Availability seeded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Seeding failed' });
    }
});


app.post('/appointments', authenticateJWT, async (req, res) => {
    const { name, email, doctorId, date, time, isVisit, phone } = req.body;

    const slot = await Availability.findOne({
        doctorId,
        date,
        time,
        isBooked: false
    });

    if (!slot) {
        return res.status(400).json({ message: 'Time slot is not available' });
    }

    // Save booking
    const booking = new Booking({ name, email, doctorId, date, time, isVisit, phone });
    await booking.save();

    // Mark slot as booked
    slot.isBooked = true;
    await slot.save();

    // Send SMS confirmation
    try {
        const doctor = await Doctor.findById(doctorId);
        const message = `Hi ${name}, your appointment with Dr. ${doctor.name} is confirmed for ${date} at ${time}.`;

        console.log(`📲 Sending SMS to ${phone}...`);

        const sms = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE,
            to: phone.startsWith('+') ? phone : `+${phone}`
        });

        console.log('✅ SMS sent successfully:', sms.sid);
    } catch (err) {
        console.error('❌ Failed to send SMS:', err.message);
    }

    res.status(201).json({ message: 'Appointment booked successfully' });
});

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
// Configure file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Create this folder if it doesn’t exist
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// POST /doctors/add
app.post('/doctors/add', authenticateJWT, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { doctorId, name, age, phone, specialization, experience } = req.body;
        const image = req.file?.filename;

        const doctor = new Doctor({ doctorId, name, age, phone, specialization, experience, image });
        await doctor.save();

        // Automatically generate availability for this doctor (next 30 days, 9AM–4PM)
        const generateTimeSlots = (startHour = 9, endHour = 17) => {
            const slots = [];
            for (let hour = startHour; hour < endHour; hour++) {
                const time = `${hour.toString().padStart(2, '0')}:00`;
                slots.push(time);
            }
            return slots;
        };

        const generateDates = (daysAhead = 30) => {
            const dates = [];
            const today = new Date();
            for (let i = 0; i < daysAhead; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                dates.push(dateStr);
            }
            return dates;
        };

        const timeSlots = generateTimeSlots();
        const dates = generateDates();

        const availabilityDocs = [];

        for (const date of dates) {
            for (const time of timeSlots) {
                availabilityDocs.push({
                    doctorId: doctor._id,
                    date,
                    time,
                    isBooked: false
                });
            }
        }

        await Availability.insertMany(availabilityDocs);


        res.status(201).json({ success: true, message: 'Doctor added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to add doctor' });
    }
});
app.post('/payment', authenticateJWT, async (req, res) => {
    const { token, amount } = req.body; // amount should be in the smallest unit (e.g., cents)

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd', // or any currency you prefer
            payment_method: token.id,
            confirm: true,
        });

        res.json({ success: true, message: 'Payment Successful', paymentIntent });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Payment Failed', error: error.message });
    }
});
// Backend: POST /create-payment-intent
app.post('/create-payment-intent', authenticateJWT, async (req, res) => {
    const { amount } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
