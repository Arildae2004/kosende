const userService = require('../services/userService');

class UserController {
    /**
     * Get all users (admin)
     * GET /api/users/admin/all
     */
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            return res.json({
                success: true,
                data: users,
            });
        } catch (error) {
            console.error('Get all users error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get user by ID (admin)
     * GET /api/users/admin/:id
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan',
                });
            }
            return res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Admin delete user and all associated data
     * DELETE /api/users/admin/:id
     */
    async adminDeleteUser(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;

            // Prevent admin from deleting themselves
            if (id === adminId) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak dapat menghapus akun sendiri',
                });
            }

            const result = await userService.adminDeleteUser(id, adminId);
            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error('Admin delete user error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new UserController();
