// backend/src/modules/landholding/landholding.controller.js
import landholdingService from './landholding.service.js';

class LandholdingController {
    /**
     * POST /api/landholding
     * Saves or Updates a Certificate of Landholding.
     */
    async save(req, res) {
        try {
            const data = req.body;
            const staffAuthId = data.staffAuthId;

            // 1. Basic Validations
            if (!staffAuthId) {
                return res.status(400).json({ error: 'staffAuthId is required.' });
            }
            if (!data.requestId) {
                return res.status(400).json({ error: 'requestId is required.' });
            }
            if (!data.declarantName?.trim()) {
                return res.status(400).json({ error: 'Declarant / Owner Name is required.' });
            }
            
            // Validate that property rows exist and have the mandatory TD/ARP number
            if (!data.propertyRows?.length || data.propertyRows.some(r => !r.tdArpNumber?.trim())) {
                return res.status(400).json({ error: 'At least one property row with a TD/ARP No. is required.' });
            }

            // 2. Logic for status
            // If action is 'draft', keep it as DRAFT. Otherwise, it moves to PENDING_PAYMENT
            const status = data.action === 'draft' ? 'DRAFT' : 'PENDING_PAYMENT';

            // 3. Call Service
            const record = await landholdingService.saveLandholdingCertificate(data, staffAuthId, status);
            
            return res.status(201).json({
                message: `Certificate successfully saved as ${status}`,
                data: record
            });
        } catch (err) {
            console.error('[LandholdingController.save]', err);
            return res.status(500).json({ error: err.message || 'Failed to save landholding certificate.' });
        }
    }

    /**
     * GET /api/landholding/:id
     * Fetches a specific certificate by its UUID.
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const record = await landholdingService.getLandholdingById(id);

            if (!record) {
                return res.status(404).json({ error: 'Certificate not found.' });
            }

            return res.json(record);
        } catch (err) {
            console.error('[LandholdingController.getById]', err);
            return res.status(500).json({ error: 'Failed to fetch certificate details.' });
        }
    }

    /**
     * GET /api/landholding/request/:requestId
     * Fetches the certificate linked to a specific request ID.
     * This is used when the UI needs to load existing data for a request.
     */
    async getByRequestId(req, res) {
        try {
            const { requestId } = req.params;
            const record = await landholdingService.getLandholdingCertificateByRequestId(requestId);

            if (!record) {
                return res.status(404).json({ error: 'No landholding certificate found for this request.' });
            }

            return res.json(record);
        } catch (err) {
            console.error('[LandholdingController.getByRequestId]', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch landholding certificate.' });
        }
    }
}

export default new LandholdingController();