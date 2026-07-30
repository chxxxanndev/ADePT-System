import axios from 'axios';
import type { TaxDeclarationFormData } from '../types/taxDeclaration';
import { requestService } from './requestService';

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
            barangay: formData.barangayId,
            municipality: formData.municipalityId,
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
                area: row.area || null,
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
     * This bridges the gap between Supabase column names and the PDF Template's expected prop names.
     */
    getTaxDeclaration: async (requestId: string) => {
        try {
            const [res, meta] = await Promise.all([
                axios.get(`${API_BASE}/${requestId}`),
                requestService.getMetadata(),
            ]);
            const dbData = res.data.data;

            if (!dbData) return null;

            const classificationMap: Record<string, string> = {};
            (meta?.classifications || []).forEach((c: any) => {
                classificationMap[c.id] = c.label;
            });

            // kind_of_property is stored as a CODE (e.g. "RESIDENTIAL"), not a
            // lookup id — matches how the backend's saveTaxDeclaration already
            // resolves it against lookup_values.code for encoded_property_types.
            // So this map is keyed by code, not id (unlike classificationMap above).
            const propertyTypeMap: Record<string, string> = {};
            (meta?.propertyTypes || []).forEach((p: any) => {
                propertyTypeMap[p.code] = p.label;
            });

            const assessmentRows = (dbData.encoded_assessment_rows || []).map((row: any) => ({
                classificationLabel: classificationMap[row.classification_id] || row.classification_id || 'N/A',
                kindOfProperty: propertyTypeMap[row.kind_of_property] || row.kind_of_property || '',
                area: row.area,
                areaUnit: row.area_unit,
                marketValue: row.market_value,
                assessmentLevel: row.assessment_level,
                assessedValue: row.assessed_value,
            }));

            // No dedicated "total area" column exists yet — derive it by
            // summing the per-row areas, since that's the only source of
            // area data currently captured by the form.
            const totalArea = assessmentRows.reduce(
                (sum: number, r: any) => sum + (parseFloat(r.area) || 0),
                0
            );

            // area_unit is free text typed by the encoder (e.g. "has.",
            // "HAS.", "sqm.") — not a fixed set of values — so we can't map
            // it to a canonical label. Instead, carry through whatever the
            // encoder actually typed on the first row that has one.
            const distinctUnits = [
                ...new Set(
                    assessmentRows
                        .map((r: any) => (r.areaUnit || '').trim())
                        .filter(Boolean)
                ),
            ];

            if (distinctUnits.length > 1) {
                console.warn(
                    '[taxDeclarationService] Assessment rows have mixed area units:',
                    distinctUnits,
                    '— totalArea sums them as if they were the same unit.'
                );
            }

            const areaUnitSuffix = distinctUnits[0] || '';

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
                barangay: dbData.barangay?.name || '',
                municipality: dbData.municipality?.name || '',
                octTctNumber: dbData.oct_tct_cloa_number,
                surveyNumber: dbData.survey_number,
                lotNumber: dbData.lot_number,
                blkNumber: dbData.block_number,
                boundaryNorth: dbData.boundary_north,
                boundarySouth: dbData.boundary_south,
                boundaryEast: dbData.boundary_east,
                boundaryWest: dbData.boundary_west,
                totalMarketValue: dbData.total_market_value,
                totalAssessedValue: dbData.total_assessed_value,
                totalAssessedValueWords: dbData.amount_in_words,
                taxable: dbData.taxability === 'TAXABLE',
                taxEffectivity: dbData.effectivity_year,
                cancelsArpNo: dbData.cancelled_td_number,
                memoranda: dbData.memoranda,
                area: totalArea > 0 ? `${totalArea}${areaUnitSuffix ? ' ' + areaUnitSuffix : ''}` : '',

                assessmentRows,
            };
        } catch (error) {
            console.error("[taxDeclarationService] Error fetching details:", error);
            throw error;
        }
    },
    updateDraft: async (id: string, updateData: any) => {
        const res = await axios.put(`${API_BASE}/${id}/edit-draft`, updateData);
        return res.data;
    },
};