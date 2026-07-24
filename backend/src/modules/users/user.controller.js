import UserService from './user.service.js';

/**
 * GET /api/users/staff
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

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const updated = await UserService.decideAccountRequest(id, normalizedDecision, reason, actingStaff);
        res.status(200).json({ message: `Account request ${normalizedDecision}.`, request: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found')
            ? 404
            : error.message.includes('permit') || error.message.includes('Only the Super Admin')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * POST /api/users/staff
 */
export const createStaff = async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, roleCode } = req.body;

        if (!firstName || !lastName || !email || !username || !password) {
            return res.status(400).json({ error: 'First name, last name, email, username, and password are required.' });
        }

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const created = await UserService.createStaff({
            firstName,
            lastName,
            email,
            username,
            password,
            roleCode,
        }, actingStaff);

        res.status(201).json({ message: 'Staff account created.', staff: created });
    } catch (error) {
        const statusCode = error.message.includes('already') || error.message.includes('exists')
            ? 409
            : error.message.includes('permit') || error.message.includes('Only the Super Admin')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/staff/:id/status
 * Body: { status: 'ACTIVE' | 'DISABLED', reason?: string }
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

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const updated = await UserService.updateStaffStatus(id, status, reason, actingStaff);
        res.status(200).json({ message: 'Staff status updated.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found')
            ? 404
            : error.message.includes('permit') || error.message.includes('Only the Super Admin') || error.message.includes('only manage')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/staff/:id/admin-level
 * Body: { adminLevel: 'HIGH' | 'MEDIUM' | 'LOW' }
 * Super Admin only.
 */
export const setAdminLevel = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminLevel } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Staff ID is required.' });
        }
        if (!adminLevel) {
            return res.status(400).json({ error: 'adminLevel field is required in the request body.' });
        }

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const updated = await UserService.setAdminLevel(id, adminLevel, actingStaff);
        res.status(200).json({ message: 'Admin level updated.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found')
            ? 404
            : error.message.includes('Only the Super Admin')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/staff/:id/promote-to-admin
 * Body: { adminLevel: 'HIGH' | 'MEDIUM' | 'LOW' }
 * Super Admin only.
 */
export const promoteToAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminLevel } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Staff ID is required.' });
        }
        if (!adminLevel) {
            return res.status(400).json({ error: 'adminLevel field is required in the request body.' });
        }

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const updated = await UserService.promoteToAdmin(id, adminLevel, actingStaff);
        res.status(200).json({ message: 'Staff member promoted to Admin.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found')
            ? 404
            : error.message.includes('Only the Super Admin')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

/**
 * PATCH /api/users/staff/:id/demote-to-staff
 * Super Admin only.
 */
export const demoteToStaff = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Staff ID is required.' });
        }

        const actingStaff = await UserService.getActingStaff(req.user.id);
        const updated = await UserService.demoteToStaff(id, actingStaff);
        res.status(200).json({ message: 'Admin demoted to Office Staff.', staff: updated });
    } catch (error) {
        const statusCode = error.message.includes('not found')
            ? 404
            : error.message.includes('Only the Super Admin')
                ? 403
                : 400;
        res.status(statusCode).json({ error: error.message });
    }
};