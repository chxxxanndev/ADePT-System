import landholdingService from './landholding.service.js';

class LandholdingController {
    /**
     * POST /api/landholding
     * Saves a Certificate of Landholding as DRAFT or PENDING_PAYMENT.
     */
    async save(req, res) {
        try {
            const data = req.body;
            const staffAuthId = data.staffAuthId;

            if (!staffAuthId) {
                return res.status(400).json({ error: 'staffAuthId is required.' });
            }
            if (!data.requestId) {
                return res.status(400).json({ error: 'requestId is required.' });
            }
            if (!data.declarantName?.trim()) {
                return res.status(400).json({ error: 'Declarant / Owner Name is required.' });
            }
            if (!data.propertyRows?.length || data.propertyRows.some(r => !r.tdArpNumber?.trim())) {
                return res.status(400).json({ error: 'TD/ARP No. is required for every property row.' });
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
     * GET /api/landholding/request/:requestId
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