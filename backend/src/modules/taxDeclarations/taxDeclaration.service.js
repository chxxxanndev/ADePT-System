import { supabase, useMock } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

const mockStore = new Map();

class TaxDeclarationService {

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
                const best = municipality_id
                    ? matches.find((b) => b.municipality_id === municipality_id) ?? matches[0]
                    : matches[0];
                barangay_id = best.id;
                if (!municipality_id) municipality_id = best.municipality_id;
            }
        }

        return { barangay_id, municipality_id };
    }

    async _resolveClassificationLabel(label) {
    if (!label?.trim()) return null;
    const trimmed = label.trim();
    const candidateCode = trimmed.toUpperCase().replace(/\s+/g, '_');

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

    if (createErr) return candidateCode; 
    return created?.code || candidateCode;
}


 
    async _resolveClassificationCode(row) {
        const rawRef = String(row.classificationId ?? '').trim();
        if (rawRef) {
            const [byId, byCode] = await Promise.all([
                supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').eq('id', rawRef).limit(1).maybeSingle(),
                supabase.from('lookup_values').select('code').eq('category', 'CLASSIFICATION').eq('code', rawRef).limit(1).maybeSingle(),
            ]);
            if (!byId.error && byId.data?.code) return byId.data.code;
            if (!byCode.error && byCode.data?.code) return byCode.data.code;
        }
        return this._resolveClassificationLabel(row.classificationLabel);
    }

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

        const { data: existing, error: existingErr } = await supabase
            .from('encoded_tax_declarations')
            .select('id, barangay_id, municipality_id')
            .eq('request_id', data.requestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingErr) throw existingErr;

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

        if (data.assessmentRows?.length) {
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

        if (oldRowIds.length > 0) {
            const { error: delRowsErr } = await supabase
                .from('encoded_assessment_rows')
                .delete()
                .in('id', oldRowIds);
            if (delRowsErr) throw delRowsErr;
        }

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

    async getTaxDeclarationByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find((r) => r.request_id === requestId);
            if (!record) return null;
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

        const { data: rows, error: rowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('*')
            .eq('encoded_tax_declaration_id', data.id)
            .order('row_order', { ascending: true });

        if (rowsErr) throw rowsErr;

        data.assessments = rows ?? [];

        return data;
    }

    async getTaxDeclaration(requestId) {
        return this.getTaxDeclarationByRequestId(requestId);
    }

    async updateDraft(id, formData) {
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

    if (Array.isArray(formData.assessments)) {
        const { data: oldRows, error: oldRowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('id')
            .eq('encoded_tax_declaration_id', id);
        if (oldRowsErr) throw oldRowsErr;
        const oldRowIds = (oldRows ?? []).map((r) => r.id);
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
            if (insertErr) throw insertErr; 
        }

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