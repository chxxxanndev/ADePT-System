import RequestService from '../services/request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const metadata = await RequestService.getMetadata();
        res.status(200).json(metadata);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch form options.' });
    }
};

export const createRequest = async (req, res) => {
    try {
        const formData = req.body;
        
        // Basic Validation
        if (!formData.declarantName || !formData.documentTypeIds?.length) {
            return res.status(400).json({ error: 'Declarant name and at least one document type are required.' });
        }

        // Sanitize payload: convert empty string UUID fields to null to avoid Postgres type errors
        const sanitize = (val) => (val === '' ? null : val);
        if (formData.purposeId !== undefined) formData.purposeId = sanitize(formData.purposeId);
        if (formData.barangayId !== undefined) formData.barangayId = sanitize(formData.barangayId);
        if (formData.municipalityId !== undefined) formData.municipalityId = sanitize(formData.municipalityId);

        // Pass auth user ID from middleware (req.user.id)
        // For now, if middleware isn't setup, we use a fallback or pass it from body
        const staffAuthId = formData.staffAuthId; 

        const result = await RequestService.saveNewRequest(formData, staffAuthId);
        res.status(201).json({ message: 'Request created successfully', data: result });
    } catch (error) {
        console.error("Create Request Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Guard: Postgres uuid columns reject non-UUID strings with a cryptic 500.
        // Return a clear 400 instead so the frontend gets a meaningful error message.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(id)) {
            return res.status(400).json({ error: `Invalid request id format: "${id}". Expected a UUID.` });
        }

        const formData = req.body;
        
        // Sanitize payload: convert empty string UUID fields to null
        const sanitize = (val) => (val === '' ? null : val);
        if (formData.purposeId !== undefined) formData.purposeId = sanitize(formData.purposeId);
        if (formData.barangayId !== undefined) formData.barangayId = sanitize(formData.barangayId);
        if (formData.municipalityId !== undefined) formData.municipalityId = sanitize(formData.municipalityId);

        const result = await RequestService.updateRequest(id, formData);
        res.status(200).json({ message: 'Request updated successfully', data: result });
    } catch (error) {
        console.error("Update Request Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(id)) {
            return res.status(400).json({ error: `Invalid request id format: "${id}". Expected a UUID.` });
        }

        await RequestService.deleteRequest(id);
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error("Delete Request Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllRequests = async (req, res) => {
    try {
        const requests = await RequestService.getAllRequests();
        res.status(200).json(requests);
    } catch (error) {
        console.error("Get All Requests Error:", error);
        res.status(500).json({ error: error.message });
    }
};