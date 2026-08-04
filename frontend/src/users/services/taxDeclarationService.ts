import type { TaxDeclarationFormData } from '../types/taxDeclaration';
import { requestService, api } from './requestService';
import axios from 'axios';

export const taxDeclarationService = {
    /**
     * Save a tax declaration to the backend. This hits the upsert-capable
     * endpoint (backend saveTaxDeclaration finds-or-creates by requestId),
     * so it is safe to call this for BOTH first-time creation and
     * subsequent saves — see the modal's handleSave for how this replaces
     * the old id-gated branching.
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
            assessorName: formData.assessorName,
            assessorTitle: formData.assessorTitle,
            memoranda: formData.memoranda,
            notes: formData.notes,
            assessmentRows: formData.assessmentRows.map((row, idx) => ({
                rowOrder: idx,
                kindOfProperty: row.kindOfProperty || null,
                classificationId: row.classificationId || null,
                // NEW: pass the free-text label through too. The backend's
                // saveTaxDeclaration now falls back to resolving this into
                // a classificationId when one wasn't already supplied —
                // needed because the quick-edit modal only ever collects a
                // free-text label, never a resolved id.
                classificationLabel: (row as any).classificationLabel || null,
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
            const res = await api.post('/tax-declarations', payload);
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
     * FETCH AND TRANSLATE DATA FOR PDF / VIEWING
     *
     * FIX: the object returned here now includes BOTH the original
     * "translated" keys (assessmentRows, taxable) AND the keys the
     * InitialDocumentPreviewModal actually reads (assessments, taxability).
     * Previously the modal's `fullData?.assessments` and
     * `editData?.taxability` always came back undefined — not because the
     * data wasn't there, but because it was there under different key
     * names. That silently produced "0 assessments" / "always TAXABLE" in
     * the UI even when the backend had real rows and a real taxability
     * value.
     */
    getTaxDeclaration: async (requestId: string) => {
        try {
            // We fetch metadata separately so that if the declaration call 404s, 
            // we don't lose the metadata context.
            const meta = await requestService.getMetadata();
            
            let dbData;
            try {
                const res = await api.get(`/tax-declarations/${requestId}`);
                dbData = res.data.data;
            } catch (error) {
                // If it's a 404, it means no declaration has been encoded yet.
                // We return null so the UI knows it's a fresh/empty request.
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    return null;
                }
                // If it's any other error (500, network, etc), re-throw it.
                throw error;
            }

            if (!dbData) return null;

            const classificationMap: Record<string, string> = {};
            (meta?.classifications || []).forEach((c: any) => {
                // FIX: classification_id in the DB actually stores the
                // classification's CODE (e.g. "AGRICULTURAL"), not its
                // lookup_values.id UUID — same pattern as kind_of_property.
                // Keying this map by c.id was why almost every row fell
                // through to showing the raw code (or "N/A" when null)
                // instead of the pretty label.
                classificationMap[c.code] = c.label;
            });

            const propertyTypeMap: Record<string, string> = {};
            (meta?.propertyTypes || []).forEach((p: any) => {
                propertyTypeMap[p.code] = p.label;
            });

            const assessmentRows = (dbData.encoded_assessment_rows || []).map((row: any) => {
                // FIX: a handful of legacy rows stored mixed-case values
                // ("Residential") instead of the uppercase code
                // ("RESIDENTIAL") that lookup_values.code actually uses.
                // Normalize before lookup so both forms resolve correctly.
                const rawClassification = (row.classification_id || '').trim();
                const normalizedKey = rawClassification.toUpperCase();
                return {
                    classificationLabel: classificationMap[normalizedKey] || rawClassification || 'N/A',
                    kindOfProperty: propertyTypeMap[row.kind_of_property] || row.kind_of_property || '',
                    area: row.area,
                    areaUnit: row.area_unit,
                    marketValue: row.market_value,
                    assessmentLevel: row.assessment_level,
                    assessedValue: row.assessed_value,
                };
            });

            const totalArea = assessmentRows.reduce(
                (sum: number, r: any) => sum + (parseFloat(r.area) || 0),
                0
            );

            const distinctUnits = [
                ...new Set(
                    assessmentRows
                        .map((r: any) => (r.areaUnit || '').trim())
                        .filter(Boolean)
                ),
            ];

            const areaUnitSuffix = distinctUnits[0] || '';

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
                // Kept for any other callers relying on the old boolean shape.
                taxable: dbData.taxability === 'TAXABLE',
                // FIX: added — this is the key the modal's edit <select> and
                // preview actually read (`editData?.taxability`).
                taxability: dbData.taxability || 'TAXABLE',
                taxEffectivity: dbData.effectivity_year,
                cancelsArpNo: dbData.cancelled_td_number,
                assessorName: dbData.assessor_name,
                assessorTitle: dbData.assessor_title,
                memoranda: dbData.memoranda,
                area: totalArea > 0 ? `${totalArea}${areaUnitSuffix ? ' ' + areaUnitSuffix : ''}` : '',
                // Kept for any other callers relying on the old key name.
                assessmentRows,
                // FIX: added — this is the key the modal's preview/edit
                // tables, updateAssessment/addAssessmentRow/removeAssessmentRow,
                // and handleSave's total calculation all actually read.
                assessments: assessmentRows,
            };
        } catch (error) {
            console.error("[taxDeclarationService] Error fetching details:", error);
            throw error;
        }
    },

    updateDraft: async (id: string, updateData: any) => {
        const res = await api.put(`/tax-declarations/${id}/edit-draft`, updateData);
        return res.data;
    },

    getRawForEdit: async (requestId: string) => {
        try {
            const res = await api.get(`/tax-declarations/${requestId}`);
            return res.data?.data ?? null;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },
};