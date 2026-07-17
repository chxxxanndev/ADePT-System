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
        if (data.assessmentRows?.length) {
            const rows = data.assessmentRows.map((row, idx) => ({
                encoded_tax_declaration_id: td.id,
                row_order: idx,
                classification_id: row.classificationId || null,
                actual_use_id: row.actualUseId || null,
                actual_use_other_text: row.actualUseOtherText || null,
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
        // kind of property used across all assessment rows).
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
            .select('id, document_types(requires_tax_declaration)')
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
     * Uses maybeSingle() with an explicit "most recent" order instead of
     * single(), so this can't crash even if old duplicate rows exist from
     * before the upsert fix — it just returns the latest one.
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
                encoded_assessment_rows ( * ),
                encoded_property_types ( * )
            `)
            .eq('request_id', requestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
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