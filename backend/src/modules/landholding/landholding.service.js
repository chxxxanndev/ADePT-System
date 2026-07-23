// backend/src/modules/landholding/landholding.service.js
import { supabase, useMock } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

const mockStore = new Map();

class LandholdingService {
    /**
     * Saves a new Landholding Certificate and its property rows.
     */
    async saveLandholdingCertificate(data, staffAuthId, status = 'DRAFT') {
        if (useMock) {
            return this._mockSave(data, staffAuthId, status);
        }

        // 1. Get the internal Staff ID from the Auth ID
        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        // 2. Insert the main Certificate record
        const certPayload = {
            request_id: data.requestId,
            declarant_name: data.declarantName,
            ownership_type: data.ownershipType ?? 'single',
            date_given: data.dateGiven || null,
            given_at: data.givenAt ?? 'Dipolog City',
            purpose: data.purpose ?? null,
            status,
            encoded_by: staff.id,
        };

        const { data: cert, error: certErr } = await supabase
            .from('encoded_landholding_certificates')
            .insert([certPayload])
            .select()
            .single();

        if (certErr) throw certErr;

        // 3. Insert the Property Rows linked to this Certificate
        if (data.propertyRows?.length) {
            const rows = data.propertyRows.map((row, idx) => ({
                encoded_landholding_certificate_id: cert.id,
                row_order: idx,
                td_arp_number: row.tdArpNumber,
                location_of_property: row.locationOfProperty ?? null,
                lot_number: row.lotNumber ?? null,
                title_number: row.titleNumber ?? null,
                area: row.area ?? null,
                assessed_value: row.assessedValue || 0,
            }));

            const { error: rowErr } = await supabase
                .from('encoded_landholding_property_rows')
                .insert(rows);

            if (rowErr) throw rowErr;
        }

        return cert;
    }

    /**
     * Fetches a certificate by ID, including its property rows and the parent request info (OR#, etc.)
     */
    async getLandholdingById(id) {
    if (useMock) return mockStore.get(id) ?? null;

    // 1. Fetch the certificate and its property rows
    const { data: cert, error: certErr } = await supabase
        .from('encoded_landholding_certificates')
        .select(`
            *,
            properties:encoded_landholding_property_rows ( * )
        `)
        .eq('id', id)
        .single();

    if (certErr) throw certErr;

    // 2. Manually fetch the request info using the request_id from the cert
    const { data: request, error: reqErr } = await supabase
        .from('requests')
        .select('or_number, payment_date, authorized_signatory')
        .eq('id', cert.request_id)
        .single();

    // 3. Combine them manually
    return {
        ...cert,
        request: request || null,
        properties: cert.properties ? cert.properties.sort((a, b) => a.row_order - b.row_order) : []
    };
}

    /**
     * Fetches the certificate linked to a Request ID.
     */
    async getLandholdingCertificateByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find(r => r.request_id === requestId);
            return record ?? null;
        }

        const { data, error } = await supabase
            .from('encoded_landholding_certificates')
            .select(`
                *,
                request:requests (
                    or_number,
                    payment_date,
                    authorized_signatory
                ),
                properties:encoded_landholding_property_rows ( * )
            `)
            .eq('request_id', requestId)
            .maybeSingle(); // Use maybeSingle in case no certificate exists yet

        if (error) throw error;

        if (data?.properties) {
            data.properties.sort((a, b) => a.row_order - b.row_order);
        }

        return data;
    }

    // --- MOCK LOGIC ---
    _mockSave(data, staffAuthId, status) {
        const id = randomUUID();
        const record = {
            id,
            request_id: data.requestId,
            declarant_name: data.declarantName,
            ownership_type: data.ownershipType ?? 'single',
            date_given: data.dateGiven || new Date().toISOString(),
            given_at: data.givenAt ?? 'Dipolog City',
            purpose: data.purpose ?? null,
            status,
            encoded_by: staffAuthId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Mocking the joined data
            request: {
                or_number: 'MOCK-OR-123',
                payment_date: new Date().toISOString(),
                authorized_signatory: 'ENGR. VICENTE P. DESUY'
            },
            properties: data.propertyRows?.map((r, i) => ({ ...r, row_order: i })) ?? []
        };
        mockStore.set(id, record);
        return record;
    }
}

export default new LandholdingService();