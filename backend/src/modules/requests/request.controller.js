import RequestService from './request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const metadata = await RequestService.getMetadata();
        res.status(200).json(metadata);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

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


export const getTransactionRegistry = async (req, res) => {
    try {
        const { from, to } = req.query;
        const transactions = await RequestService.getTransactionRegistry(from, to);
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

export const forwardRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientStaffId, targetStaffId, note } = req.body;
        const result = await RequestService.forwardRequest(id, {
            recipientStaffId: recipientStaffId || targetStaffId,
            note,
            actorStaffId: req.staffId  
        });
        res.status(200).json({ message: 'Request forwarded.', request: result });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error.message });
    }
};

export const markAsReleased = async (req, res) => {
    try {
        const { id } = req.params;
        const { releasedBy } = req.body;
        if (!releasedBy) {
            return res.status(400).json({ error: 'releasedBy is required.' });
        }
        const result = await RequestService.markAsReleased(id, releasedBy);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createReprint = async (req, res) => {
    try {
        const { id, docId } = req.params; 
        const result = await RequestService.createReprint(id, docId);
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

export const amendRequest = async (req, res) => {
    try {
        const result = await RequestService.amendRequest(req.params.id, req.staffId);
        res.status(200).json(result);
    } catch (err) {
        console.error('Amend request failed:', err.message);
        res.status(400).json({ error: err.message });
    }
};

export const getDocumentDataByRequestId = async (req, res) => {
    try {
        const result = await RequestService.getDocumentDataByRequestId(req.params.id);
        res.status(200).json(result);
    } catch (err) {
        console.error('Fetch document data failed:', err.message);
        res.status(400).json({ error: err.message });
    }
};

export const getDashboardMetrics = async (req, res) => {
    try {
        const { from, to } = req.query;
        const metrics = await RequestService.getDashboardMetrics(from, to);
        res.status(200).json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getReportsData = async (req, res) => {
    try {
        const { from, to } = req.query;
        const reportsData = await RequestService.getReportsData(from, to);
        res.status(200).json(reportsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

