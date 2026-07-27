import RequestService from './request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const data = await RequestService.getMetadata();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getRequestById = async (req, res) => {
    try {
        const data = await RequestService.getRequestById(req.params.id);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateRequest = async (req, res) => {
    try {
        const result = await RequestService.updateRequest(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const createRequest = async (req, res) => {
    try {
        const result = await RequestService.createRequest(req.body, req.staffId);
        res.status(201).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const forwardRequest = async (req, res) => {
    try {
        const result = await RequestService.forwardRequest(req.params.id, {
            recipientStaffId: req.body.recipientStaffId,
            note: req.body.note,
            actorStaffId: req.staffId
        });
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const getAllRequests = async (req, res) => {
    try {
        const requests = await RequestService.getRequests();
        res.status(200).json(requests);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

export const checkOrUniqueness = async (req, res) => {
    try {
        const { orNumber, requestId } = req.query;
        if (!orNumber) return res.status(400).json({ error: 'O.R. number is required' });
        const result = await RequestService.checkOrUniqueness(orNumber, requestId);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const releaseRequest = async (req, res) => {
    try {
        const result = await RequestService.releaseRequest(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const deleteRequest = async (req, res) => {
    try {
        const result = await RequestService.deleteRequest(req.params.id);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};