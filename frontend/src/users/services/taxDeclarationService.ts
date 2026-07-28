import axios from 'axios';
import type { TaxDeclarationFormData } from '../types/taxDeclaration';

const API_BASE = 'http://localhost:5000/api/tax-declarations';

export const taxDeclarationService = {
    /**
     * Save a tax declaration to the backend.
     */
    save: async (
        formData: TaxDeclarationFormData,
        requestId: string,
        staffAuthId: string,
    ) => {
        const payload = {
            staffAuthId,
            requestId,
            taxDeclarationNumber: formData.taxDeclarationNumber,
            propertyIndexNumber: formData.propertyIndexNumber,
            arpNumber: formData.arpNumber,
            effectivityYear: Number(formData.effectivityYear) || null,
            ownerName: formData.ownerName,
            ownerAddress: formData.ownerAddress,
            ownerTin: formData.ownerTin,
            ownerTelephone: formData.ownerTelephone,
            administratorName: formData.administratorName,
            administratorAddress: formData.administratorAddress,
            administratorTin: formData.administratorTin,
            administratorTelephone: formData.administratorTelephone,
            propertyStreet: formData.propertyStreet,
            barangayId: formData.barangayId,
            municipalityId: formData.municipalityId,
            octTctNumber: formData.octTctNumber,
            surveyNumber: formData.surveyNumber,
            lotNumber: formData.lotNumber,
            blockNumber: formData.blockNumber,
            boundaryNorth: formData.boundaryNorth,
            boundarySouth: formData.boundarySouth,
            boundaryEast: formData.boundaryEast,
            boundaryWest: formData.boundaryWest,
            totalMarketValue: formData.totalMarketValue,
            totalAssessedValue: formData.totalAssessedValue,
            amountInWords: formData.amountInWords,
            taxability: formData.taxability,
            cancelledTdNumber: formData.arpNumber,
            memoranda: formData.memoranda,
            notes: formData.notes,
            assessmentRows: formData.assessmentRows.map((row, idx) => ({
                rowOrder: idx,
                kindOfProperty: row.kindOfProperty || null,
                classificationId: row.classificationId || null,
                actualUseId: row.actualUseId || null,
                actualUseOtherText: row.actualUseOtherText || null,
                area: row.area ? Number(row.area) : null,
                areaUnit: row.areaUnit,
                marketValue: row.marketValue ? Number(row.marketValue) : null,
                assessmentLevel: row.assessmentLevel ? Number(row.assessmentLevel) : null,
                assessedValue: row.assessedValue ? Number(row.assessedValue) : null,
            })),
        };

        try {
            const res = await axios.post(API_BASE, payload);
            return res.data;
        } catch (err: any) {
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
     * FETCH AND TRANSLATE DATA FOR PDF
     * This bridges the gap between Supabase column names and your PDF Template names.
     */
    getTaxDeclaration: async (requestId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/${requestId}`);
            const dbData = res.data.data; // Extracts the record from { data: { ... } }

            if (!dbData) return null;

            // TRANSLATOR: Maps database snake_case to PDF camelCase
            return {
                id: dbData.id,
                request: dbData.request,
                taxDeclarationNumber: dbData.tax_declaration_number,
                propertyIndexNumber: dbData.property_identification_number,
                arpNumber: dbData.arp_number,
                ownerName: dbData.owner_name,
                ownerAddress: dbData.owner_address,
                administratorName: dbData.administrator_name,
                administratorAddress: dbData.administrator_address,
                barangay: dbData.barangay_id,
                municipality: dbData.municipality_id,
                boundaryNorth: dbData.boundary_north,
                boundarySouth: dbData.boundary_south,
                boundaryEast: dbData.boundary_east,
                boundaryWest: dbData.boundary_west,
                totalMarketValue: dbData.total_market_value,
                totalAssessedValue: dbData.total_assessed_value,
                amountInWords: dbData.amount_in_words,
                taxability: dbData.taxability,
                effectivityYear: dbData.effectivity_year,

                assessments: (dbData.encoded_assessment_rows || []).map((row: any) => ({
                    classificationLabel: row.classification_id || 'LAND',
                    kindOfProperty: row.classification_id,
                    area: row.area,
                    marketValue: row.market_value,
                    assessmentLevel: row.assessment_level,
                    assessedValue: row.assessed_value
                }))
            };
        } catch (error: any) {
            // A 404 means no tax declaration has been encoded for this
            // request yet (or this document type doesn't require one) —
            // that's an expected state, not a failure. Return null so
            // callers can render an empty/placeholder state instead of
            // treating it as an error.
            if (error?.response?.status === 404) {
                return null;
            }
            console.error("[taxDeclarationService] Error fetching details:", error);
            throw error;
        }
    },
    updateDraft: async (id: string, updateData: any) => {
        const res = await axios.put(`${API_BASE}/${id}/edit-draft`, updateData);
        return res.data;
    },
};