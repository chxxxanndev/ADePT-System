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
 * GET /api/users/account-requests
 * Returns pending sign-up requests needing approval.
 */
export const getAccountRequests = async (req, res) => {
    try {
        const requests = await UserService.getAccountRequests();
        res.status(200).json({ requests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/account-requests/:id/decision
 * Approves or rejects a pending sign-up request.
 */
export const decideAccountRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, reason } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Request ID is required.' });
        }
        const normalizedDecision = decision === 'declined' ? 'rejected' : decision;
        if (!['approved', 'rejected'].includes(normalizedDecision)) {
            return res.status(400).json({ error: 'decision must be approved or rejected.' });
        }

        const updated = await UserService.decideAccountRequest(id, normalizedDecision, reason);
        res.status(200).json({ message: `Account request ${normalizedDecision}.`, request: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * POST /api/users/staff
 * Creates a new staff account and profile.
 */
export const createStaff = async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, roleCode } = req.body;

        if (!firstName || !lastName || !email || !username || !password) {
            return res.status(400).json({ error: 'First name, last name, email, username, and password are required.' });
        }

        const created = await UserService.createStaff({
            firstName,
            lastName,
            email,
            username,
            password,
            roleCode,
        });

        res.status(201).json({ message: 'Staff account created.', staff: created });
    } catch (error) {
        const statusCode = error.message.includes('already') || error.message.includes('exists') ? 409 : 400;
        res.status(statusCode).json({ error: error.message });
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
