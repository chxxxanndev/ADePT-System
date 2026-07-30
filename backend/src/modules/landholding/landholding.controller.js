import landholdingService from './landholding.service.js';

class LandholdingController {
    /**
     * POST /api/landholding
     * Saves or creates a new landholding certificate draft/submission.
     */
    async save(req, res) {
        try {
            const data = req.body;
            const staffAuthId = data.staffAuthId || req.user?.id;

            if (!staffAuthId) {
                return res.status(400).json({ error: 'staffAuthId is required.' });
            }
            if (!data.requestId) {
                return res.status(400).json({ error: 'requestId is required.' });
            }
            if (!data.declarantName?.trim()) {
                return res.status(400).json({ error: 'Declarant Name is required.' });
            }

            const status = data.action === 'draft' ? 'DRAFT' : 'PENDING_PAYMENT';
            const record = await landholdingService.saveLandholdingCertificate(data, staffAuthId, status);
            return res.status(201).json(record);
        } catch (err) {
            console.error('[LandholdingController.save]', err);
            return res.status(500).json({ error: err.message || 'Failed to save landholding certificate.' });
        }
    }

    /**
     * GET /api/landholding/:id
     * Fetches full certificate data by Certificate UUID.
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'Certificate ID is required.' });

            const record = await landholdingService.getLandholdingById(id);
            if (!record) return res.status(404).json({ error: 'Landholding certificate not found.' });

            return res.json(record);
        } catch (err) {
            console.error('[LandholdingController.getById]', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch certificate.' });
        }
    }

    /**
     * GET /api/landholding/request/:requestId
     * Fetches certificate details linked to a Request ID.
     */
    async getByRequestId(req, res) {
        try {
            const { requestId } = req.params;
            if (!requestId) return res.status(400).json({ error: 'Request ID is required.' });

            const record = await landholdingService.getLandholdingCertificateByRequestId(requestId);
            if (!record) return res.status(404).json({ error: 'No landholding certificate found for this request.' });

            return res.json(record);
        } catch (err) {
            console.error('[LandholdingController.getByRequestId]', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch certificate by request ID.' });
        }
    }

    /**
     * PUT /api/landholding/:id/edit-draft
     * Updates an existing certificate draft.
     */
    async updateDraft(req, res) {
        try {
            const { id } = req.params;
            const formData = req.body;

            if (!id) return res.status(400).json({ error: 'Certificate ID is required.' });

            const updatedRecord = await landholdingService.updateDraft(id, formData);
            return res.json(updatedRecord);
        } catch (err) {
            console.error('[LandholdingController.updateDraft]', err);
            return res.status(500).json({ error: err.message || 'Failed to update draft.' });
        }
    }
}

export default new LandholdingController();