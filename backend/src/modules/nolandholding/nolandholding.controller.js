import noLandholdingService from './nolandholding.service.js';

class NoLandholdingController {
    async save(req, res) {
        try {
            const data = req.body;
            const staffAuthId = data.staffAuthId;

            if (!staffAuthId) return res.status(400).json({ error: 'staffAuthId is required.' });
            if (!data.requestId) return res.status(400).json({ error: 'requestId is required.' });
            if (!data.declarantName?.trim()) return res.status(400).json({ error: 'Declarant Name is required.' });

            const status = data.action === 'draft' ? 'DRAFT' : 'PENDING_PAYMENT';
            const record = await noLandholdingService.saveNoLandholdingCertificate(data, staffAuthId, status);
            return res.status(201).json(record);
        } catch (err) {
            console.error('[NoLandholdingController.save]', err);
            return res.status(500).json({ error: err.message || 'Failed to save no-landholding certificate.' });
        }
    }

    async getByRequestId(req, res) {
        try {
            const record = await noLandholdingService.getByRequestId(req.params.requestId);
            if (!record) return res.status(404).json({ error: 'No certificate found.' });
            return res.json(record);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    async updateDraft(req, res) {
        try {
            const { id } = req.params;
            const formData = req.body;

            if (!id) return res.status(400).json({ error: 'id is required.' });

            const updated = await noLandholdingService.updateDraft(id, formData);
            return res.json(updated);
        } catch (err) {
            console.error('[NoLandholdingController.updateDraft]', err);
            return res.status(500).json({ error: err.message || 'Failed to update draft.' });
        }
    }
}

export default new NoLandholdingController();