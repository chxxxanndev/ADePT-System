import RequestService from '../requests/request.service.js';

export const getFormMetadata = async (req, res) => {
    try {
        const metadata = await RequestService.getMetadata();
        res.status(200).json(metadata);
    } catch (error) {
        console.error('Metadata Error:', error);
        res.status(500).json({ error: 'Failed to fetch form options.' });
    }
};

export const createRequest = async (req, res) => {
    try {
        const formData = req.body;

        if (!formData.declarantName || !formData.documentTypeIds?.length) {
            return res.status(400).json({ error: 'Declarant name and at least one document type are required.' });
        }

        const staffAuthId = formData.staffAuthId;
        if (!staffAuthId) {
            return res.status(400).json({ error: 'Missing staff auth id.' });
        }

        const result = await RequestService.saveNewRequest(formData, staffAuthId);
        res.status(201).json({ message: 'Request created successfully', data: result });
    } catch (error) {
        console.error('Create Request Error:', error);
        if (error.message?.includes('chk_releaser_not_encoder')) {
            return res.status(400).json({ error: 'The releasing staff cannot be the same person who encoded this request.' });
        }
        if (error.message?.includes('chk_verifier_not_encoder')) {
            return res.status(400).json({ error: 'The verifying staff cannot be the same person who encoded this request.' });
        }
        res.status(500).json({ error: error.message || 'Failed to create request.' });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const formData = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Missing request id.' });
        }
        if (!formData.declarantName) {
            return res.status(400).json({ error: 'Declarant name is required.' });
        }

        const result = await RequestService.updateRequest(id, formData);
        res.status(200).json({ message: 'Request updated successfully', data: result });
    } catch (error) {
        console.error('Update Request Error:', error);
        if (error.message?.includes('chk_releaser_not_encoder')) {
            return res.status(400).json({ error: 'The releasing staff cannot be the same person who encoded this request.' });
        }
        if (error.message?.includes('chk_verifier_not_encoder')) {
            return res.status(400).json({ error: 'The verifying staff cannot be the same person who encoded this request.' });
        }
        if (error.message === 'REQUEST_NOT_FOUND') {
            return res.status(404).json({ error: 'Request not found.' });
        }
        res.status(500).json({ error: error.message || 'Failed to update request.' });
    }
};