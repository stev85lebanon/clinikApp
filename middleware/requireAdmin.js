// middleware/requireAdmin.js
const User = require('../models/User');

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

module.exports = requireAdmin;
