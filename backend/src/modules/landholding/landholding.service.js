import { supabase, useMock } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

const mockStore = new Map();

class LandholdingService {
    async saveLandholdingCertificate(data, staffAuthId, status = 'DRAFT') {
        if (useMock) {
            return this._mockSave(data, staffAuthId, status);
        }

        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        const certPayload = {
            request_id: data.requestId,
            declarant_name: data.declarantName,
            ownership_type: data.ownershipType ?? 'single',
            date_given: data.dateGiven || null,
            given_at: data.givenAt ?? null,
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

        if (data.propertyRows?.length) {
            const rows = data.propertyRows.map((row, idx) => ({
                encoded_landholding_certificate_id: cert.id,
                row_order: idx,
                td_arp_number: row.tdArpNumber,
                location_of_property: row.locationOfProperty ?? null,
                lot_number: row.lotNumber ?? null,
                title_number: row.titleNumber ?? null,
                area: row.area ?? null,
                assessed_value: row.assessedValue ?? null,
            }));

            const { error: rowErr } = await supabase
                .from('encoded_landholding_property_rows')
                .insert(rows);

            if (rowErr) throw rowErr;
        }

        return cert;
    }

    async getLandholdingCertificateByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find(r => r.request_id === requestId);
            return record ?? null;
        }

        const { data, error } = await supabase
            .from('encoded_landholding_certificates')
            .select(`
                *,
                encoded_landholding_property_rows ( * )
            `)
            .eq('request_id', requestId)
            .single();

        if (error) throw error;
        return data;
    }

    _mockSave(data, staffAuthId, status) {
        const id = randomUUID();
        const record = {
            id,
            request_id: data.requestId,
            declarant_name: data.declarantName,
            ownership_type: data.ownershipType ?? 'single',
            date_given: data.dateGiven || null,
            given_at: data.givenAt ?? null,
            purpose: data.purpose ?? null,
            status,
            encoded_by: staffAuthId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _propertyRows: data.propertyRows ?? [],
        };
        mockStore.set(id, record);
        console.log('[MOCK] Landholding Certificate saved:', id);
        return record;
    }
}

export default new LandholdingService();