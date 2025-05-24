const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const bcrypt = require('bcrypt');
const Doctor = require('./models/Doctor');


app.use(cors());
app.use(express.json());

const PORT = 4000;
const JWT_SECRET = "mustafa1985"; // Use a secret key for JWT

// Mock doctors
// const doctors = [
//     { id: 1, name: "ahmad salem", age: "31", phone: "358678", specialization: "Heart and cardiovascular system", experience: 6, image: "https://www.shutterstock.com/image-photo/portrait-handsome-male-doctor-stethoscope-600nw-2480850611.jpg" },
//     { id: 2, name: "karim aljamal", age: "24", phone: "91606263", specialization: "brain and nervous system", experience: 3, image: "https://static.vecteezy.com/system/resources/thumbnails/026/375/249/small_2x/ai-generative-portrait-of-confident-male-doctor-in-white-coat-and-stethoscope-standing-with-arms-crossed-and-looking-at-camera-photo.jpg" },
//     { id: 3, name: "sofie saleh", age: "33", phone: "383644", specialization: "Infants, children, and adolescents", experience: 12, image: "https://bankofindia.co.in/documents/20121/24946494/star-personal-loan-doctor-plus.webp/a108c0f5-53a1-95c8-a44c-542db4b7df32?t=1723636922057" },
//     { id: 4, name: "mustafa aljamal", age: "40", phone: "91606263", specialization: "skin", experience: 12, image: "https://t4.ftcdn.net/jpg/02/60/04/09/360_F_260040900_oO6YW1sHTnKxby4GcjCvtypUCWjnQRg5.jpg" },
// ];

// Availability by doctorId and date
// const availability = {
//     '1': {
//         '2025-05-15': ['09:00', '10:00', '11:00'],
//         '2025-05-16': ['14:00', '15:00']
//     },
//     '2': {
//         '2025-05-15': ['10:30', '12:30'],
//         '2025-05-16': ['09:00', '13:00']
//     },
//     '3': {
//         '2025-05-15': ["13:00"],
//         '2025-05-16': ['16:00', '17:00'],
//         '2025-05-17': ['16:00', '17:00'],
//         '2025-05-18': ['16:00', '17:00']
//     },
//     '4': {
//         '2025-05-15': ['9:00', '11:00'],
//         '2025-05-16': ['10:00', '16:00', '17:00', '18:00', '17:00']
//     }
// };

// Existing users for mock authentication
// const users = [
//     { username: "testuser", password: "password123" },
//     { username: "karim", password: "2016" },
//     { username: "lynn", password: "2011" },
// ];

// POST /login - Login endpoint
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
        // Generate a JWT token
        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ success: true, token: token, user: { username: user.username }, message: "Login successful" });
    } else {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// POST /register - Register new user
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // Check if the username already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already exists" });
    }

    // Add the new user to the users array (In a real app, you'd store this in a database)
    users.push({ username, password });

    return res.status(201).json({ success: true, message: "User created successfully" });
});

// Middleware to authenticate using JWT
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Get token from 'Authorization' header
    if (!token) {
        return res.status(403).json({ success: false, message: "Access denied. No token provided." });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

// // GET /doctors - Get doctors information (protected route)
// app.get('/doctors', authenticateJWT, (req, res) => {
//     res.json(doctors);
// });
// GET /doctors from MongoDB
aapp.get('/doctors', authenticateJWT, async (req, res) => {
    try {
        const doctors = await Doctor.find(); // MongoDB model
        res.json(doctors);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        res.status(500).json({ message: 'Server error fetching doctors' });
    }
});



// GET /availability - Get availability for a specific doctor (protected route)
app.get('/availability', authenticateJWT, (req, res) => {
    const { doctorId, date } = req.query;
    const times = availability[doctorId]?.[date] || [];
    res.json(times);
});
// POST /reset-password
// app.post('/reset-password', async (req, res) => {
//     const { username, newPassword } = req.body;
//     if (!username || !newPassword) {
//         return res.status(400).json({ message: 'Username and new password are required' });
//     }

//     const user = await db.getUserByUsername(username); // Implement this function
//     if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10); // Make sure you're using bcrypt
//     await db.updateUserPassword(username, hashedPassword); // Also implement this

//     res.json({ message: 'Password reset successful' });
// });

app.listen(PORT, () => {
    console.log(`Mock API running on http://localhost:${PORT}`);
});
