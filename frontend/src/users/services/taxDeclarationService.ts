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
            // FIX: the quick-edit modal's data only carries the resolved
            // NAME strings (`barangay`, `municipality` — from
            // getTaxDeclaration's translation), never `barangayId` /
            // `municipalityId`. Sending only the Id keys meant every modal
            // save submitted undefined here, and the backend
            // (_resolveLocationIds) then wrote NULL into barangay_id /
            // municipality_id — silently wiping the property location.
            barangay: formData.barangay || formData.barangayId,
            municipality: formData.municipality || formData.municipalityId,
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
                // FIX: strip thousand separators so a value typed as
                // "123,456.78" reaches the backend as plain "123456.78".
                // The DB column is numeric(14,4) — a comma-formatted string
                // would be rejected by Postgres, and without this the modal
                // path could also upload an unparseable area.
                area: row.area != null && String(row.area).trim() !== ''
                    ? String(row.area).replace(/,/g, '')
                    : null,
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
                // FIX: rows saved by the full encoding form
                // (TaxDeclarationForm.tsx) store the lookup_values.id (a
                // number) in classification_id — its dropdown sends
                // `value={opt.id}`. Map the id to the label too, so those
                // rows render the classification name instead of the raw
                // number. (The backend now converts ids to codes on save;
                // this covers rows written before that fix.)
                classificationMap[c.id] = c.label;
            });

            const propertyTypeMap: Record<string, string> = {};
            (meta?.propertyTypes || []).forEach((p: any) => {
                propertyTypeMap[p.code] = p.label;
                // Same defensive id→label mapping as classifications above.
                propertyTypeMap[p.id] = p.label;
            });

            // FIX: the backend (encoded_tax_declarations service,
            // getTaxDeclarationByRequestId) attaches the child rows under
            // the key `assessments`, not `encoded_assessment_rows`. That
            // key never existed on the API response, so this line always
            // evaluated to `[]`, and both `assessmentRows` and
            // `assessments` further down came back empty even though the
            // rows exist in the database. This is what produced
            // "Assessments (0)" in the preview/edit modal AND empty rows in
            // the generated PDF — both read off this same translated
            // object. The dbData.encoded_assessment_rows fallback is kept
            // only in case some other backend response shape still uses it.
            const assessmentRows = (dbData.assessments || dbData.encoded_assessment_rows || []).map((row: any) => {
                // FIX: a handful of legacy rows stored mixed-case values
                // ("Residential") instead of the uppercase code
                // ("RESIDENTIAL") that lookup_values.code actually uses.
                // Normalize before lookup so both forms resolve correctly.
                const rawClassification = (row.classification_id || '').trim();
                const normalizedKey = rawClassification.toUpperCase();
                return {
                    // FIX: was `|| 'N/A'` — an empty classification became
                    // "N/A", which then showed in the PDF, sat in the edit
                    // modal's input, and on the next save got resolved into
                    // a bogus 'N/A' lookup_values row and persisted as the
                    // row's classification code. Empty stays empty now.
                    classificationLabel: classificationMap[normalizedKey] || rawClassification || '',
                    kindOfProperty: propertyTypeMap[row.kind_of_property] || row.kind_of_property || '',
                    area: row.area,
                    areaUnit: row.area_unit,
                    marketValue: row.market_value,
                    assessmentLevel: row.assessment_level,
                    assessedValue: row.assessed_value,
                };
            });

            const totalArea = assessmentRows.reduce(
                (sum: number, r: any) => sum + (parseFloat(String(r.area || '').replace(/,/g, '')) || 0),
                0
            );

            const distinctUnits = [
                ...new Set(
                    assessmentRows
                        .map((r: any) => (r.areaUnit || '').trim())
                        .filter(Boolean)
                ),
            ];

            // Current — causes the error
const areaUnitSuffix = (distinctUnits[0] as string) || '';
const displayUnitSuffix = /sq/i.test(areaUnitSuffix) ? 'sqm.' : areaUnitSuffix ? 'has.' : '';

            // FIX: format totalArea with comma separators before building
            // the area string. Previously `totalArea` was a raw float
            // (e.g. 1223467), so data.area arrived in the PDF as
            // "1223467 sqm." with no formatting. toLocaleString with
            // maximumFractionDigits:10 preserves decimal places for
            // hectare values (e.g. 1.5) while adding commas for large
            // whole numbers (e.g. 1,223,467).
            //
            // FIX: sqm always renders with AT LEAST two decimals. The DB
            // stores area in a numeric(14,4) column, so a trailing zero typed
            // on the form ("1,756.50") is normalized to 1756.5 and read back
            // as a plain number — without a minimum it printed "1,756.5" on
            // the CTC instead of the "1,756.50" from the physical record.
            // Hectares keep as-typed formatting (1.5 stays 1.5).
            const formattedArea = totalArea > 0
                ? totalArea.toLocaleString(undefined, {
                      minimumFractionDigits: /sq/i.test(areaUnitSuffix) ? 2 : 0,
                      maximumFractionDigits: 10,
                  })
                : '';

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
                area: formattedArea
                    ? `${formattedArea}${displayUnitSuffix ? ' ' + displayUnitSuffix : ''}`
                    : '',
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