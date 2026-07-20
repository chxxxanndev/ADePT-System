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
  * Body: { status: 'ACTIVE' | 'DISABLED' }
 */
export const updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Staff ID is required.' });
        }
        if (!status) {
            return res.status(400).json({ error: 'status field is required in the request body.' });
        }
        const updated = await UserService.updateStaffStatus(id, status, reason);
        res.status(200).json({ message: 'Staff status updated.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};
