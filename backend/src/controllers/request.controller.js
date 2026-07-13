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