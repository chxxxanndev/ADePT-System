import TaxDeclarationService from './taxDeclaration.service.js';

/**
 * POST /api/tax-declarations
 * Create (or upsert) a Tax Declaration record for a given request.
 */
export const createTaxDeclaration = async (req, res) => {
    try {
        const data = req.body;

        // Basic validation
        if (!data.requestId) {
            return res.status(400).json({ error: 'requestId is required.' });
        }
        if (!data.taxDeclarationNumber) {
            return res.status(400).json({ error: 'taxDeclarationNumber is required.' });
        }
        if (!data.ownerName) {
            return res.status(400).json({ error: 'ownerName is required.' });
        }

        // Encoder's auth user ID comes from request body (will use auth middleware later)
        const staffAuthId = data.staffAuthId;

        const result = await TaxDeclarationService.saveTaxDeclaration(data, staffAuthId);

        return res.status(201).json({
            message: 'Tax Declaration saved successfully.',
            data: result,
        });
    } catch (error) {
        console.error('[createTaxDeclaration] Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to save tax declaration.' });
    }
};

/**
 * GET /api/tax-declarations/:requestId
 * Fetch the Tax Declaration associated with a given request ID.
 */
export const getTaxDeclaration = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({ error: 'requestId param is required.' });
        }

        const result = await TaxDeclarationService.getTaxDeclarationByRequestId(requestId);

        if (!result) {
            return res.status(404).json({ error: 'Tax declaration not found for this request.' });
        }

        return res.status(200).json({ data: result });
    } catch (error) {
        console.error('[getTaxDeclaration] Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch tax declaration.' });
    }
};
