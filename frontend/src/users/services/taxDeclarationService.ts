import axios from 'axios';
import type { TaxDeclarationFormData } from '../types/taxDeclaration';

const API_BASE = 'http://localhost:5000/api/tax-declarations';

export const taxDeclarationService = {
    /**
     * Save a tax declaration to the backend.
     * Falls back gracefully if the server is unavailable (mock mode).
     */
    save: async (
        formData: TaxDeclarationFormData,
        requestId: string,
        staffAuthId: string,
    ) => {
        const payload = {
            staffAuthId,
            requestId,
            taxDeclarationNumber:         formData.taxDeclarationNumber,
            propertyIndexNumber:          formData.propertyIndexNumber,
            arpNumber:                    formData.arpNumber,
            effectivityYear:              Number(formData.effectivityYear) || null,
            ownerName:                    formData.ownerName,
            ownerAddress:                 formData.ownerAddress,
            ownerTin:                     formData.ownerTin,
            ownerTelephone:               formData.ownerTelephone,
            administratorName:            formData.administratorName,
            administratorAddress:         formData.administratorAddress,
            administratorTin:             formData.administratorTin,
            administratorTelephone:       formData.administratorTelephone,
            propertyStreet:               formData.propertyStreet,
            barangay:                     formData.barangay,
            municipality:                 formData.municipality,
            octTctNumber:                 formData.octTctNumber,
            surveyNumber:                 formData.surveyNumber,
            lotNumber:                    formData.lotNumber,
            blockNumber:                  formData.blockNumber,
            boundaryNorth:                formData.boundaryNorth,
            boundarySouth:                formData.boundarySouth,
            boundaryEast:                 formData.boundaryEast,
            boundaryWest:                 formData.boundaryWest,
            totalMarketValue:             formData.totalMarketValue,
            totalAssessedValue:           formData.totalAssessedValue,
            amountInWords:                formData.amountInWords,
            taxability:                   formData.taxability,
            cancelledTdNumber:            formData.arpNumber,
            memoranda:                    formData.memoranda,
            notes:                        formData.notes,
            assessmentRows: formData.assessmentRows.map((row, idx) => ({
                rowOrder:           idx,
                classificationId:   row.classificationId || null,
                actualUseId:        row.actualUseId || null,
                actualUseOtherText: row.actualUseOtherText || null,
                area:               row.area ? Number(row.area) : null,
                areaUnit:           row.areaUnit,
                marketValue:        row.marketValue ? Number(row.marketValue) : null,
                assessmentLevel:    row.assessmentLevel ? Number(row.assessmentLevel) : null,
                assessedValue:      row.assessedValue ? Number(row.assessedValue) : null,
            })),
        };

        try {
            const res = await axios.post(API_BASE, payload);
            return res.data;
        } catch (err: any) {
            // If the server is unreachable (mock/dev mode) generate a local mock response
            if (!err.response) {
                console.warn('[taxDeclarationService] Server unreachable — using local mock.');
                return {
                    message: 'Tax Declaration saved (mock).',
                    data: { id: crypto.randomUUID(), ...payload },
                };
            }
            throw err;
        }
    },

    /**
     * Fetch an existing tax declaration by its parent request ID.
     */
    getByRequestId: async (requestId: string) => {
        const res = await axios.get(`${API_BASE}/${requestId}`);
        return res.data;
    },
};
