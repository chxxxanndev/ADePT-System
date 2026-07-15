import { supabase, useMock } from '../config/supabase.js';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Mock in-memory store (used when Supabase is not configured)
// ---------------------------------------------------------------------------
const mockStore = new Map();

class TaxDeclarationService {
    /**
     * Save a new Tax Declaration and its assessment rows.
     * @param {object} data - The full TD form payload
     * @param {string} staffAuthId - The auth user UUID of the encoder
     * @returns {object} The saved tax declaration record
     */
    async saveTaxDeclaration(data, staffAuthId) {
        if (useMock) {
            return this._mockSave(data, staffAuthId);
        }

        // 1. Resolve staff profile UUID from auth user id
        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        // 2. Insert the main tax declaration record
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
            barangay_id: data.barangayId ?? null,
            municipality_id: data.municipalityId ?? null,
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
            encoded_by: staff.id,
        };

        const { data: td, error: tdErr } = await supabase
            .from('encoded_tax_declarations')
            .insert([tdPayload])
            .select()
            .single();

        if (tdErr) throw tdErr;

        // 3. Insert assessment rows
        if (data.assessmentRows?.length) {
            const rows = data.assessmentRows.map((row, idx) => ({
                encoded_tax_declaration_id: td.id,
                row_order: idx,
                classification_id: row.classificationId ?? null,
                actual_use_id: row.actualUseId ?? null,
                actual_use_other_text: row.actualUseOtherText ?? null,
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

        return td;
    }

    /**
     * Fetch a tax declaration by its parent request ID.
     */
    async getTaxDeclarationByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find(r => r.request_id === requestId);
            return record ?? null;
        }

        const { data, error } = await supabase
            .from('encoded_tax_declarations')
            .select(`
                *,
                encoded_assessment_rows ( * )
            `)
            .eq('request_id', requestId)
            .single();

        if (error) throw error;
        return data;
    }

    // -------------------------------------------------------------------------
    // Mock helpers
    // -------------------------------------------------------------------------
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
