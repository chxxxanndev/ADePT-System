import RequestService from './request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const metadata = await RequestService.getMetadata();
        res.status(200).json(metadata);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/**
 * RESTORED — required by request.routes.js (GET /:id) but missing from the
 * version pasted into this conversation.
 */
export const getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await RequestService.getRequestById(id);
        res.status(200).json(request);
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

export const createRequest = async (req, res) => {
    try {
        const result = await RequestService.createRequest(req.body, req.body.staffAuthId);
        res.status(201).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAllRequests = async (req, res) => {
    try {
        const requests = await RequestService.getRequests();
        res.status(200).json(requests);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/**
 * NEW: GET /api/requests/registry
 * Returns requests reshaped to match the frontend's Transaction type,
 * for the Transaction Registry page. See RequestService.getTransactionRegistry()
 * for the documented gaps (property info, payment amounts, generated
 * documents, and activity timeline are stubbed until schema work lands).
 *
 * NOTE: not yet added to request.routes.js — add this line there:
 *   router.get('/registry', requireAuth, getTransactionRegistry);
 * (register it above the '/:id' route so '/registry' isn't swallowed by
 * the ':id' param matcher)
 */
export const getTransactionRegistry = async (req, res) => {
    try {
        const transactions = await RequestService.getTransactionRegistry();
        res.status(200).json({ transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const result = await RequestService.updateRequest(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const deleteRequest = async (req, res) => {
    try {
        const result = await RequestService.deleteRequest(req.params.id);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const checkOrUniqueness = async (req, res) => {
    try {
        const { orNumber, requestId } = req.query;
        if (!orNumber) {
            return res.status(400).json({ error: 'O.R. number is required' });
        }
        const result = await RequestService.checkOrUniqueness(orNumber, requestId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const releaseRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await RequestService.releaseRequest(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const voidRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const result = await RequestService.voidRequest(id, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * RESTORED (best-effort reconstruction) — required by request.routes.js
 * (POST /:id/forward) but missing from the version pasted into this
 * conversation. See the detailed comment on
 * RequestService.forwardRequest() — please verify this matches the
 * original intended behavior.
 */
export const forwardRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientStaffId, targetStaffId, note } = req.body;
        const result = await RequestService.forwardRequest(id, {
            recipientStaffId: recipientStaffId || targetStaffId,
            note,
            actorStaffId: req.user?.id
        });
        res.status(200).json({ message: 'Request forwarded.', request: result });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};