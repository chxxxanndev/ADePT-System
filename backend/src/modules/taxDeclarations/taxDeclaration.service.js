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
    const trimmed = label.trim();
    const candidateCode = trimmed.toUpperCase().replace(/\s+/g, '_');

    // Two separate .eq()/.ilike() lookups instead of a hand-built .or()
    // filter string — a label containing a comma, parenthesis, or other
    // PostgREST filter-syntax character would make the old .or() string
    // malformed and throw. With the old delete-then-insert ordering,
    // that throw arrived *after* existing rows were already wiped.
    // FIX: `.limit(1)` is added before `.maybeSingle()`. The ilike lookup
    // does partial, case-insensitive matching, so a label like "Residential"
    // can match MULTIPLE lookup_values rows ("Residential", "Residential
    // Land", ...). Without the limit, maybeSingle() throws on >1 match, and
    // since saveTaxDeclaration previously deleted old assessment rows before
    // inserting new ones, that throw wiped the whole assessment section.
    // With .limit(1) the query returns at most one row, so it can never
    // throw on multiple matches. Each lookup's error is also only raised
    // when BOTH lookups fail, so a spurious error on one never aborts a
    // save when the other already resolved the classification.
    const [byCode, byValue] = await Promise.all([
        supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').eq('code', candidateCode).limit(1).maybeSingle(),
        supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').ilike('value', trimmed).limit(1).maybeSingle(),
    ]);
    if (byCode.error && byValue.error) throw byCode.error;

    const existing = byCode.data || byValue.data;
    if (existing?.code) return existing.code;

    const { data: created, error: createErr } = await supabase
        .from('lookup_values')
        .insert([{ category: 'CLASSIFICATION', code: candidateCode, value: trimmed }])
        .select('code')
        .single();

    if (createErr) return candidateCode; // race with another save — use the normalized code
    return created?.code || candidateCode;
}


    /**
     * Normalize a row's classification reference to a lookup_values CODE.
     *
     * FIX: the full encoding form (TaxDeclarationForm.tsx) sends the
     * classification dropdown's VALUE, which is the lookup_values.id (a
     * number) — while the quick-edit modal sends either a code or a
     * free-text label. The classification_id column is consumed everywhere
     * as a CODE (see getTaxDeclaration's classificationMap lookup), so
     * writing a raw id into it made the PDF/modal show the number instead
     * of the classification label. This resolves whichever shape arrived:
     *   1. id matches an existing lookup_values row  -> its code
     *   2. the string is already a code              -> used as-is
     *   3. otherwise (sentinel / unknown)            -> resolved via label
     */
    async _resolveClassificationCode(row) {
        const rawRef = String(row.classificationId ?? '').trim();
        if (rawRef) {
            const [byId, byCode] = await Promise.all([
                supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').eq('id', rawRef).limit(1).maybeSingle(),
                supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').eq('code', rawRef).limit(1).maybeSingle(),
            ]);
            // Either lookup failing (e.g. 'RESIDENTIAL' is not a valid
            // integer id, or the code no longer exists) is fine — only use
            // it when it actually resolved something.
            if (!byId.error && byId.data?.code) return byId.data.code;
            if (!byCode.error && byCode.data?.code) return byCode.data.code;
        }
        return this._resolveClassificationLabel(row.classificationLabel);
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

        // 1. Find existing TD for this request (one per request, per the
        // one-declarant-per-request business rule). Fetched BEFORE the
        // payload is built so its location FKs can act as a fallback.
        const { data: existing, error: existingErr } = await supabase
            .from('encoded_tax_declarations')
            .select('id, barangay_id, municipality_id')
            .eq('request_id', data.requestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingErr) throw existingErr;

        // FIX: never overwrite a stored location with NULL. The quick-edit
        // modal submits barangay/municipality as free-text names (there is
        // no `barangayId` key on its data), and _resolveLocationIds returns
        // nulls whenever the text doesn't match the reference tables — so
        // before this fix every modal save silently nulled barangay_id and
        // municipality_id. Falling back to the previously stored FK keeps a
        // successful edit from wiping the property location. The FKs are
        // only written when the caller actually supplied matching names.
        const { barangay_id, municipality_id } = await this._resolveLocationIds(
            data.barangay,
            data.municipality
        );
        const finalBarangayId = barangay_id ?? (existing?.barangay_id ?? null);
        const finalMunicipalityId = municipality_id ?? (existing?.municipality_id ?? null);

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
            barangay_id: finalBarangayId,
            municipality_id: finalMunicipalityId,
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
        } else {
            const { data: inserted, error: insErr } = await supabase
                .from('encoded_tax_declarations')
                .insert([{ ...tdPayload, encoded_by: staff.id }])
                .select()
                .single();
            if (insErr) throw insErr;
            td = inserted;
        }

        // Capture the OLD child row ids BEFORE touching them. We then
        // insert the replacement rows FIRST and only delete the old ids
        // once every insert has succeeded.
        //
        // FIX (delete-after-insert): this used to delete all existing
        // assessment rows and property types up front, then insert the
        // replacements in separate, non-transactional calls. Any failure
        // between the delete and the insert (bad classification lookup, a
        // transient error, a row with an odd value) left the DB with the
        // deletes already committed and the inserts never done — silently
        // wiping the whole assessment section. Symptom: "add a row in the
        // assessment section, save, close, reopen — the assessment section
        // shows nothing in the PDF". If the insert throws now, nothing has
        // been deleted yet and the old rows stay intact.
        const { data: oldRows, error: oldRowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('id')
            .eq('encoded_tax_declaration_id', td.id);
        if (oldRowsErr) throw oldRowsErr;
        const oldRowIds = (oldRows ?? []).map((r) => r.id);

        const { data: oldTypes, error: oldTypesErr } = await supabase
            .from('encoded_property_types')
            .select('id')
            .eq('encoded_tax_declaration_id', td.id);
        if (oldTypesErr) throw oldTypesErr;
        const oldTypeIds = (oldTypes ?? []).map((r) => r.id);

        // 2. Reinsert assessment rows
        // NOTE: kind_of_property is now stored per row (matches the pattern
        // already used by classification_id / actual_use_id — plain text,
        // no FK join). This is what the PDF template reads per assessment
        // row via row.kindOfProperty.
        if (data.assessmentRows?.length) {
            // NOTE: classification_id (despite its name) stores a CODE, not a
            // lookup_values.id UUID — see _resolveClassificationLabel above.
            // row.classificationId is trusted as-is when the caller already
            // supplies one (e.g. the full encoding form's dropdown, which
            // presumably already sends a valid code). The quick-edit modal
            // only ever sends a free-text classificationLabel, which gets
            // resolved to a code here so it's never silently dropped.
            const rows = await Promise.all(data.assessmentRows.map(async (row, idx) => {
                const classificationCode = await this._resolveClassificationCode(row);
                return {
                    encoded_tax_declaration_id: td.id,
                    row_order: idx,
                    classification_id: classificationCode,
                    actual_use_id: row.actualUseId || null,
                    actual_use_other_text: row.actualUseOtherText || null,
                    kind_of_property: row.kindOfProperty || null,
                    area: row.area ?? null,
                    area_unit: row.areaUnit ?? 'HECTARE',
                    market_value: row.marketValue ?? null,
                    assessment_level: row.assessmentLevel ?? null,
                    assessed_value: row.assessedValue ?? null,
                };
            }));

            const { error: rowErr } = await supabase
                .from('encoded_assessment_rows')
                .insert(rows);

            if (rowErr) throw rowErr;
        }
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

            // FIX: delete the OLD property-type rows BEFORE inserting the
            // replacements. encoded_property_types has a unique constraint
            // on (encoded_tax_declaration_id, property_type_id), so a
            // re-save that kept the old rows while inserting the same kind
            // codes violated the constraint and aborted the entire save
            // with a 500 — the TD update (boundaries, owner, etc.) had
            // already committed, but the API errored out so the frontend
            // reported the save as failed. These rows are fully derived
            // from kindOfProperty, so deleting first is safe.
            if (oldTypeIds.length > 0) {
                const { error: delTypesErr } = await supabase
                    .from('encoded_property_types')
                    .delete()
                    .in('id', oldTypeIds);
                if (delTypesErr) throw delTypesErr;
            }

            if (ptRows.length) {
                const { error: ptInsertErr } = await supabase
                    .from('encoded_property_types')
                    .insert(ptRows);
                if (ptInsertErr) throw ptInsertErr;
            }
        }

        // 3. Both insert batches have succeeded — only now remove the old
        // child rows. If this step fails you get duplicates (recoverable),
        // never an empty assessment section. Note: when the caller submits
        // an empty assessment list, the inserts above are skipped entirely
        // and the old rows are removed here — that is the explicit
        // "delete all rows" case, and nothing can fail between the two.
        if (oldRowIds.length > 0) {
            const { error: delRowsErr } = await supabase
                .from('encoded_assessment_rows')
                .delete()
                .in('id', oldRowIds);
            if (delRowsErr) throw delRowsErr;
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
            if (!record) return null;
            // FIX: _mockSave stores rows under `_assessmentRows`; expose
            // them under `assessments` too, the key the read side (and the
            // frontend translation) actually consumes — otherwise mock mode
            // always reported an empty assessment section.
            return { ...record, assessments: record._assessmentRows ?? [] };
        }

        const { data, error } = await supabase
            .from('encoded_tax_declarations')
            .select(`
                *,
                request:requests (
                    requested_by_name,
                    property_location,
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
        // NOTE: key is deliberately "encoded_assessment_rows" (not
        // "assessments") — that's the exact key the frontend
        // taxDeclarationService.getTaxDeclaration() reads off dbData.
        // Naming it anything else means the rows arrive in the API
        // response but get silently dropped at the frontend translation
        // step, which is what was still happening even after the join fix.
        const { data: rows, error: rowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('*')
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

    // Handle assessment rows.
    //
    // FIX: previously this deleted the existing rows FIRST, then built and
    // inserted the replacement rows. Those are two separate, non-transactional
    // Supabase calls — if building/inserting the new rows failed for any
    // reason (bad classification lookup, a freshly-added row with an odd
    // value, a transient error), the delete had already committed and there
    // was no rollback. That silently wiped the whole assessment section,
    // which is exactly the "add a row, save, reopen, assessment section is
    // empty" symptom. Now: capture the old row ids, build + INSERT the new
    // rows first, and only delete the old ids once the insert has actually
    // succeeded. If the insert throws, nothing has been deleted yet.
    if (Array.isArray(formData.assessments)) {
        const { data: oldRows, error: oldRowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('id')
            .eq('encoded_tax_declaration_id', id);
        if (oldRowsErr) throw oldRowsErr;
        const oldRowIds = (oldRows ?? []).map((r) => r.id);

        // assessed_value is computed here, server-side, from market_value +
        // assessment_level. The edit modal only ever displays it live in the
        // UI — it never writes it back onto the row object — so trusting a
        // client-supplied assessedValue silently saved NULL for every row on
        // every edit.
        const newRows = await Promise.all(
            formData.assessments.map(async (row, idx) => {
                const classificationCode = await this._resolveClassificationLabel(
                    row.classificationLabel || row.classification_label
                );
                const marketValue = Number(row.marketValue ?? row.market_value ?? 0) || 0;
                const assessmentLevel = Number(row.assessmentLevel ?? row.assessment_level ?? 0) || 0;
                const assessedValue = Math.round(((marketValue * assessmentLevel) / 100) / 10) * 10;

                return {
                    encoded_tax_declaration_id: id,
                    row_order: idx,
                    classification_id: classificationCode,
                    kind_of_property: (row.kindOfProperty || row.kind_of_property || '').trim() || null,
                    area: row.area ?? null,
                    market_value: marketValue,
                    assessment_level: assessmentLevel,
                    assessed_value: assessedValue,
                };
            })
        );

        if (newRows.length > 0) {
            const { error: insertErr } = await supabase
                .from('encoded_assessment_rows')
                .insert(newRows);
            if (insertErr) throw insertErr; // nothing deleted yet — old rows are safe
        }

        // Only now remove the old rows. If this step fails you get
        // duplicates (recoverable), never an empty table.
        if (oldRowIds.length > 0) {
            const { error: delRowsErr } = await supabase
                .from('encoded_assessment_rows')
                .delete()
                .in('id', oldRowIds);
            if (delRowsErr) throw delRowsErr;
        }

        const totalMarketValue = newRows.reduce((sum, r) => sum + (r.market_value || 0), 0);
        const totalAssessedValue = newRows.reduce((sum, r) => sum + (r.assessed_value || 0), 0);

        await supabase
            .from('encoded_tax_declarations')
            .update({
                total_market_value: totalMarketValue,
                total_assessed_value: totalAssessedValue
            })
            .eq('id', id);

        data.total_market_value = totalMarketValue;
        data.total_assessed_value = totalAssessedValue;
        data.assessments = newRows;
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