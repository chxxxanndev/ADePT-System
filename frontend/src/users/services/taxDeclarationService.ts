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
            barangayId:                   formData.barangayId,
            municipalityId:               formData.municipalityId,
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
                kindOfProperty:     row.kindOfProperty || null,
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
                taxDeclarationNumber: dbData.tax_declaration_number,
                propertyIndexNumber:  dbData.property_identification_number,
                arpNumber:            dbData.arp_number,
                ownerName:            dbData.owner_name,
                ownerAddress:         dbData.owner_address,
                barangay:             dbData.barangay_id, // Note: update if you store text
                municipality:         dbData.municipality_id,
                boundaryNorth:        dbData.boundary_north,
                boundarySouth:        dbData.boundary_south,
                boundaryEast:         dbData.boundary_east,
                boundaryWest:         dbData.boundary_west,
                totalAssessedValue:   dbData.total_assessed_value,
                amountInWords:        dbData.amount_in_words,
                
                // Map the child rows for the PDF table
                assessmentRows: (dbData.encoded_assessment_rows || []).map((row: any) => ({
                    classificationLabel: row.classification_id || 'LAND',
                    marketValue: row.market_value,
                    assessmentLevel: row.assessment_level,
                    assessedValue: row.assessed_value
                }))
            };
        } catch (error) {
            console.error("[taxDeclarationService] Error fetching details:", error);
            throw error;
        }
    },
};