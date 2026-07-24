import RequestService from './request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const metadata = await RequestService.getMetadata();
        res.status(200).json(metadata);
    } catch (error) { res.status(500).json({ error: error.message }); }
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