import { supabase, useMock } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

const mockStore = new Map();

class TaxDeclarationService {
    /**
     * Best-effort resolution of free-text barangay/municipality names to
     * real FK ids. Case-insensitive exact-name match only — no fuzzy
     * matching. Returns nulls for anything that doesn't match, rather than
     * throwing, since this is supplementary data, not a required field.
     */
    async _resolveLocationIds(barangayText, municipalityText) {
        let municipality_id = null;
        let barangay_id = null;

        if (municipalityText?.trim()) {
            const { data: m } = await supabase
                .from('municipalities')
                .select('id')
                .ilike('name', municipalityText.trim())
                .maybeSingle();
            if (m) municipality_id = m.id;
        }

        if (barangayText?.trim()) {
            const { data: matches } = await supabase
                .from('barangays')
                .select('id, municipality_id')
                .ilike('name', barangayText.trim());

            if (matches?.length) {
                // Prefer a match within the already-resolved municipality,
                // to disambiguate barangays that share a name across towns.
                const best = municipality_id
                    ? matches.find((b) => b.municipality_id === municipality_id) ?? matches[0]
                    : matches[0];
                barangay_id = best.id;
                if (!municipality_id) municipality_id = best.municipality_id;
            }
        }

        return { barangay_id, municipality_id };
    }

    /**
     * Resolve a classification label (free text) to its UUID in the lookup_values table.
     * Returns null if no match is found.
     */
    async _resolveClassificationLabel(label) {
        if (!label?.trim()) return null;
        const { data } = await supabase
            .from('lookup_values')
            .select('id')
            .eq('category', 'CLASSIFICATION')   // adjust if your category name differs
            .ilike('value', label.trim())       // adjust column name if needed (e.g., 'label', 'name')
            .maybeSingle();
        return data?.id || null;
    }

    /**
     * Creates or updates the single Tax Declaration for a request. Business
     * rule: one request = one declarant/property = one encoded_tax_declaration
     * row, even though a request can have multiple request_documents. Every
     * document type under this request that requires_tax_declaration gets
     * linked to this same row.
     */
    async saveTaxDeclaration(data, staffAuthId) {
        if (useMock) {
            return this._mockSave(data, staffAuthId);
        }

        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        const { barangay_id, municipality_id } = await this._resolveLocationIds(
            data.barangay,
            data.municipality
        );

        const tdPayload = {
            request_id: data.requestId,
            tax_declaration_number: data.taxDeclarationNumber,
            property_identification_number: data.propertyIndexNumber ?? null,
            arp_number: data.arpNumber ?? null,
            oct_tct_cloa_number: data.octTctNumber ?? null,
            survey_number: data.surveyNumber ?? null,
            lot_number: data.lotNumber ?? null,
            block_number: data.blockNumber ?? null,
            owner_name: data.ownerName,
            owner_address: data.ownerAddress ?? null,
            owner_tin: data.ownerTin ?? null,
            owner_telephone: data.ownerTelephone ?? null,
            administrator_name: data.administratorName ?? null,
            administrator_address: data.administratorAddress ?? null,
            administrator_tin: data.administratorTin ?? null,
            administrator_telephone: data.administratorTelephone ?? null,
            property_street: data.propertyStreet ?? null,
            barangay_id,
            municipality_id,
            boundary_north: data.boundaryNorth ?? null,
            boundary_south: data.boundarySouth ?? null,
            boundary_east: data.boundaryEast ?? null,
            boundary_west: data.boundaryWest ?? null,
            total_market_value: data.totalMarketValue ?? null,
            total_assessed_value: data.totalAssessedValue ?? null,
            amount_in_words: data.amountInWords ?? null,
            taxability: data.taxability ?? 'TAXABLE',
            effectivity_year: data.effectivityYear ?? null,
            cancelled_td_number: data.cancelledTdNumber ?? null,
            assessor_name: data.assessorName ?? null,
            assessor_title: data.assessorTitle ?? null,
            memoranda: data.memoranda ?? null,
            notes: data.notes ?? null,
        };

        // 1. Find existing TD for this request (one per request, per the
        // one-declarant-per-request business rule).
        const { data: existing, error: existingErr } = await supabase
            .from('encoded_tax_declarations')
            .select('id')
            .eq('request_id', data.requestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingErr) throw existingErr;

        let td;
        if (existing) {
            const { data: updated, error: updErr } = await supabase
                .from('encoded_tax_declarations')
                .update(tdPayload)
                .eq('id', existing.id)
                .select()
                .single();
            if (updErr) throw updErr;
            td = updated;

            // Replace child rows entirely rather than diffing — the form
            // always submits its full current state, so this is simpler
            // and safe.
            const { error: delRowsErr } = await supabase
                .from('encoded_assessment_rows')
                .delete()
                .eq('encoded_tax_declaration_id', td.id);
            if (delRowsErr) throw delRowsErr;

            const { error: delTypesErr } = await supabase
                .from('encoded_property_types')
                .delete()
                .eq('encoded_tax_declaration_id', td.id);
            if (delTypesErr) throw delTypesErr;
        } else {
            const { data: inserted, error: insErr } = await supabase
                .from('encoded_tax_declarations')
                .insert([{ ...tdPayload, encoded_by: staff.id }])
                .select()
                .single();
            if (insErr) throw insErr;
            td = inserted;
        }

        // 2. Reinsert assessment rows
        // NOTE: kind_of_property is now stored per row (matches the pattern
        // already used by classification_id / actual_use_id — plain text,
        // no FK join). This is what the PDF template reads per assessment
        // row via row.kindOfProperty.
        if (data.assessmentRows?.length) {
            const rows = data.assessmentRows.map((row, idx) => ({
                encoded_tax_declaration_id: td.id,
                row_order: idx,
                classification_id: row.classificationId || null,
                actual_use_id: row.actualUseId || null,
                actual_use_other_text: row.actualUseOtherText || null,
                kind_of_property: row.kindOfProperty || null,
                area: row.area ?? null,
                area_unit: row.areaUnit ?? 'HECTARE',
                market_value: row.marketValue ?? null,
                assessment_level: row.assessmentLevel ?? null,
                assessed_value: row.assessedValue ?? null,
            }));

            const { error: rowErr } = await supabase
                .from('encoded_assessment_rows')
                .insert(rows);

            if (rowErr) throw rowErr;
        }

        // 3. Resolve kindOfProperty codes to real lookup_values ids, then
        // reinsert encoded_property_types (deduped — one row per distinct
        // kind of property used across all assessment rows). This stays as
        // a declaration-level summary/reporting list; it is NOT what the
        // PDF template reads per row (see step 2 above for that).
        const kindCodes = [
            ...new Set((data.assessmentRows ?? []).map((r) => r.kindOfProperty).filter(Boolean)),
        ];

        if (kindCodes.length) {
            const { data: ptLookups, error: ptLookupErr } = await supabase
                .from('lookup_values')
                .select('id, code')
                .in('code', kindCodes);

            if (ptLookupErr) throw ptLookupErr;

            const ptMap = {};
            ptLookups?.forEach((l) => { ptMap[l.code] = l.id; });

            const ptRows = kindCodes
                .filter((code) => ptMap[code])
                .map((code) => ({
                    encoded_tax_declaration_id: td.id,
                    property_type_id: ptMap[code],
                }));

            if (ptRows.length) {
                const { error: ptInsertErr } = await supabase
                    .from('encoded_property_types')
                    .insert(ptRows);
                if (ptInsertErr) throw ptInsertErr;
            }
        }

        // 4. Link every request_documents row under this request that
        // actually requires a tax declaration to this TD record.
        const { data: reqDocs, error: rdErr } = await supabase
            .from('request_documents')
            .select('id, document_types!fk_document_types(requires_tax_declaration)')
            .eq('request_id', data.requestId);

        if (rdErr) throw rdErr;

        const toLink = (reqDocs ?? [])
            .filter((d) => d.document_types?.requires_tax_declaration)
            .map((d) => d.id);

        if (toLink.length) {
            const { error: linkErr } = await supabase
                .from('request_documents')
                .update({ encoded_tax_declaration_id: td.id })
                .in('id', toLink);
            if (linkErr) throw linkErr;
        }

        return td;
    }

    /**
     * Fetch the tax declaration for a request, including its child rows.
     *
     * FIX: assessment rows are now fetched with a SEPARATE, EXPLICIT query
     * instead of an embedded/nested select (`assessments:encoded_assessment_rows(...)`).
     * The embedded select silently returns an empty array whenever Supabase
     * can't unambiguously resolve the FK relationship (e.g. more than one
     * FK from encoded_assessment_rows back to encoded_tax_declarations, or
     * a schema cache that hasn't picked up the relationship yet) — it does
     * NOT throw, so the bug was invisible. That's exactly what produced the
     * screenshot symptom: the parent row's own columns (total_market_value,
     * total_assessed_value) came through fine because they aren't
     * join-dependent, while `assessments` came back as [] even though the
     * rows exist in the DB. Querying encoded_assessment_rows directly
     * removes that failure mode entirely.
     */
    async getTaxDeclarationByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find((r) => r.request_id === requestId);
            return record ?? null;
        }

        const { data, error } = await supabase
            .from('encoded_tax_declarations')
            .select(`
                *,
                request:requests (
                    requested_by_name,
                    or_number,
                    payment_date,
                    authorized_signatory
                ),
                barangay:barangays ( name ),
                municipality:municipalities ( name )
            `)
            .eq('request_id', requestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Explicit, standalone fetch of the child rows — see FIX note above.
        const { data: rows, error: rowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select(`
                id,
                kindOfProperty:kind_of_property,
                classificationId:classification_id,
                actualUseId:actual_use_id,
                area,
                areaUnit:area_unit,
                marketValue:market_value,
                assessmentLevel:assessment_level,
                assessedValue:assessed_value,
                rowOrder:row_order
            `)
            .eq('encoded_tax_declaration_id', data.id)
            .order('row_order', { ascending: true });

        if (rowsErr) throw rowsErr;

        data.assessments = rows ?? [];

        return data;
    }

    /**
     * Alias kept for backward compatibility with callers using the shorter
     * name (e.g. the InitialDocumentPreviewModal component calls
     * `getTaxDeclaration`, not `getTaxDeclarationByRequestId`).
     */
    async getTaxDeclaration(requestId) {
        return this.getTaxDeclarationByRequestId(requestId);
    }

    /**
     * Update an existing draft tax declaration (used in the modal edit mode).
     * The frontend sends the full updated data, including all assessment rows.
     *
     * FIX: switched `||` fallbacks to `??` (nullish coalescing). With `||`,
     * an intentionally-cleared field (empty string '') would fall through
     * to the old snake_case value instead of actually saving as empty,
     * because '' is falsy. `??` only falls back on null/undefined.
     */
    async updateDraft(id, formData) {
        // Update the main table
        const { data, error } = await supabase
            .from('encoded_tax_declarations')
            .update({
                tax_declaration_number: formData.taxDeclarationNumber ?? formData.tax_declaration_number,
                property_identification_number: formData.propertyIndexNumber ?? formData.property_index_number,
                owner_name: formData.ownerName ?? formData.owner_name,
                owner_address: formData.ownerAddress ?? formData.owner_address,
                administrator_name: formData.administratorName ?? formData.administrator_name,
                administrator_address: formData.administratorAddress ?? formData.administrator_address,
                boundary_north: formData.boundaryNorth ?? formData.boundary_north,
                boundary_south: formData.boundarySouth ?? formData.boundary_south,
                boundary_east: formData.boundaryEast ?? formData.boundary_east,
                boundary_west: formData.boundaryWest ?? formData.boundary_west,
                oct_tct_cloa_number: formData.octTctNumber ?? formData.oct_tct_cloa_number,
                lot_number: formData.lotNumber ?? formData.lot_number,
                total_market_value: formData.totalMarketValue ?? formData.total_market_value,
                total_assessed_value: formData.totalAssessedValue ?? formData.total_assessed_value,
                taxability: formData.taxability,
                effectivity_year: formData.effectivityYear ?? formData.effectivity_year,
                assessor_name: formData.assessorName ?? formData.assessor_name,
                assessor_title: formData.assessorTitle ?? formData.assessor_title
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Handle assessment rows
        if (formData.assessments) {
            // Delete existing rows
            await supabase
                .from('encoded_assessment_rows')
                .delete()
                .eq('encoded_tax_declaration_id', id);

            // Resolve each classification label to a UUID
            const newRows = await Promise.all(
                formData.assessments.map(async (row, idx) => {
                    const classificationId = row.classificationId || row.classification_id
                        || await this._resolveClassificationLabel(
                            row.classificationLabel || row.classification_label
                        );
                    return {
                        encoded_tax_declaration_id: id,
                        row_order: idx,
                        classification_id: classificationId,
                        kind_of_property: row.kindOfProperty ?? row.kind_of_property ?? null,
                        area: row.area ?? null,
                        market_value: row.marketValue ?? row.market_value ?? null,
                        assessment_level: row.assessmentLevel ?? row.assessment_level ?? null,
                        assessed_value: row.assessedValue ?? row.assessed_value ?? null
                    };
                })
            );

            if (newRows.length > 0) {
                const { error: insertErr } = await supabase
                    .from('encoded_assessment_rows')
                    .insert(newRows);
                if (insertErr) throw insertErr;
            }

            // Keep the stored totals in sync with whatever rows were just
            // saved, so preview mode (which reads total_market_value /
            // total_assessed_value directly) never shows stale numbers
            // again even if the caller forgets to recompute them.
            const totalMarketValue = formData.assessments.reduce(
                (sum, r) => sum + (parseFloat(r.marketValue ?? r.market_value) || 0), 0
            );
            const totalAssessedValue = formData.assessments.reduce((sum, r) => {
                const mv = parseFloat(r.marketValue ?? r.market_value) || 0;
                const lvl = parseFloat(r.assessmentLevel ?? r.assessment_level) || 0;
                return sum + (mv * lvl) / 100;
            }, 0);

            await supabase
                .from('encoded_tax_declarations')
                .update({
                    total_market_value: totalMarketValue,
                    total_assessed_value: totalAssessedValue
                })
                .eq('id', id);

            data.total_market_value = totalMarketValue;
            data.total_assessed_value = totalAssessedValue;
        }

        return data;
    }

    _mockSave(data, staffAuthId) {
        const id = randomUUID();
        const record = {
            id,
            request_id: data.requestId,
            tax_declaration_number: data.taxDeclarationNumber,
            owner_name: data.ownerName,
            effectivity_year: data.effectivityYear,
            taxability: data.taxability ?? 'TAXABLE',
            total_assessed_value: data.totalAssessedValue,
            assessor_name: data.assessorName ?? null,
            assessor_title: data.assessorTitle ?? null,
            encoded_by: staffAuthId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _assessmentRows: data.assessmentRows ?? [],
        };
        mockStore.set(id, record);
        console.log('[MOCK] Tax Declaration saved:', id);
        return record;
    }
}

export default new TaxDeclarationService();