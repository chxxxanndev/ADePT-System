import UserService from './user.service.js';

/**
 * GET /api/users/staff
 * Returns every non-deleted staff member.
 */
export const getAllStaff = async (req, res) => {
    try {
        const staff = await UserService.getAllStaff();
        res.status(200).json({ staff });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/staff/:id/status
 * Body: { status: 'ACTIVE' | 'DISABLED' | 'REJECTED' }
 */
export const updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, disableReason } = req.body;
        const actingStaffId = req.user?.staffId ?? null;

        if (!id) {
            return res.status(400).json({ error: 'Staff ID is required.' });
        }
        if (!status) {
            return res.status(400).json({ error: 'status field is required in the request body.' });
        }
        if (!['ACTIVE', 'DISABLED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be ACTIVE, DISABLED, or REJECTED.' });
        }
        if (status === 'DISABLED' && !disableReason) {
            return res.status(400).json({ error: 'disableReason is required when disabling an account.' });
        }

        const updated = await UserService.updateStaffStatus(id, status, disableReason, actingStaffId);
        res.status(200).json({ message: 'Staff status updated.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};