const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// Admin routes
router.get(
    '/admin/all',
    authenticate,
    authorize('admin'),
    userController.getAllUsers
);

router.get(
    '/admin/:id',
    authenticate,
    authorize('admin'),
    userController.getUserById
);

router.delete(
    '/admin/:id',
    authenticate,
    authorize('admin'),
    userController.adminDeleteUser
);

module.exports = router;
