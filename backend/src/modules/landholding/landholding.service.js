// backend/src/modules/landholding/landholding.service.js
import { supabase, useMock } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

const mockStore = new Map();

class LandholdingService {
    /**
     * Helper to map property rows so they satisfy both camelCase and snake_case UI/PDF needs.
     */
    _normalizePropertyRow(row) {
        return {
            ...row,
            id: row.id,
            tdArpNumber: row.td_arp_number || row.tdArpNumber || '',
            td_arp_number: row.td_arp_number || row.tdArpNumber || '',
            locationOfProperty: row.location_of_property || row.locationOfProperty || '',
            location_of_property: row.location_of_property || row.locationOfProperty || '',
            lotNumber: row.lot_number || row.lotNumber || '',
            lot_number: row.lot_number || row.lotNumber || '',
            titleNumber: row.title_number || row.titleNumber || '',
            title_number: row.title_number || row.titleNumber || '',
            area: row.area || '',
            assessedValue: row.assessed_value ?? row.assessedValue ?? 0,
            assessed_value: row.assessed_value ?? row.assessedValue ?? 0,
        };
    }

    /**
     * Saves or updates a Landholding Certificate and syncs its property rows.
     */
    async saveLandholdingCertificate(data, staffAuthId, status = 'DRAFT') {
        if (useMock) {
            return this._mockSave(data, staffAuthId, status);
        }

        // 1. Get the internal Staff ID from Auth ID
        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        // 2. Prepare payload
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

        // 3. Check for existing certificate for this request
        const { data: existing } = await supabase
            .from('encoded_landholding_certificates')
            .select('id')
            .eq('request_id', data.requestId)
            .maybeSingle();

        let cert;
        if (existing) {
            const { data: updated, error: updateErr } = await supabase
                .from('encoded_landholding_certificates')
                .update(certPayload)
                .eq('id', existing.id)
                .select()
                .single();
            if (updateErr) throw updateErr;
            cert = updated;
        } else {
            const { data: inserted, error: insertErr } = await supabase
                .from('encoded_landholding_certificates')
                .insert([certPayload])
                .select()
                .single();
            if (insertErr) throw insertErr;
            cert = inserted;
        }

        // 4. Sync Property Rows (Clear existing rows and re-insert)
        const propertyInput = data.propertyRows || data.properties || [];
        if (Array.isArray(propertyInput)) {
            await supabase
                .from('encoded_landholding_property_rows')
                .delete()
                .eq('encoded_landholding_certificate_id', cert.id);

            if (propertyInput.length > 0) {
                const rows = propertyInput.map((row, idx) => ({
                    encoded_landholding_certificate_id: cert.id,
                    row_order: idx,
                    td_arp_number: row.tdArpNumber || row.td_arp_number || row.tdNo || '',
                    location_of_property: row.locationOfProperty || row.location_of_property || row.location || null,
                    lot_number: row.lotNumber || row.lot_number || row.lotNo || null,
                    title_number: row.titleNumber || row.title_number || row.titleNo || null,
                    area: row.area ?? null,
                    assessed_value: row.assessedValue || row.assessed_value || row.assdValue || 0,
                }));

                const { error: rowErr } = await supabase
                    .from('encoded_landholding_property_rows')
                    .insert(rows);

                if (rowErr) throw rowErr;
            }
        }

        // 5. Sync Signatory back to requests if provided
        if (data.signatory1Name) {
            await supabase
                .from('requests')
                .update({ authorized_signatory: data.signatory1Name })
                .eq('id', data.requestId);
        }

        return cert;
    }

    /**
     * Fetches a certificate by ID with property rows, request info, and signatory details.
     */
    async getLandholdingById(id) {
        if (useMock) return mockStore.get(id) ?? null;

        // 1. Fetch certificate and property rows
        const { data: cert, error: certErr } = await supabase
            .from('encoded_landholding_certificates')
            .select(`
                *,
                properties:encoded_landholding_property_rows ( * )
            `)
            .eq('id', id)
            .single();

        if (certErr) throw certErr;

        // 2. Fetch request info
        const { data: request, error: reqErr } = await supabase
            .from('requests')
            .select('or_number, payment_date, authorized_signatory, requested_by_name, property_location')
            .eq('id', cert.request_id)
            .maybeSingle();

        if (reqErr) throw reqErr;

        // 3. Fetch signatory details
        let signatoryDetails = null;
        if (request?.authorized_signatory) {
            const { data: sig } = await supabase
                .from('signatories')
                .select('name, title, role')
                .eq('name', request.authorized_signatory)
                .maybeSingle();
            signatoryDetails = sig;
        }

        const sortedProperties = cert.properties 
            ? cert.properties.sort((a, b) => a.row_order - b.row_order).map(this._normalizePropertyRow)
            : [];

        return {
            ...cert,
            request: request
                ? {
                      ...request,
                      signatoryDetails,
                  }
                : null,
            properties: sortedProperties,
            propertyRows: sortedProperties, // Map both property and propertyRows for PDF component compatibility
        };
    }

    /**
     * Fetches certificate linked to a Request ID.
     */
    async getLandholdingCertificateByRequestId(requestId) {
        if (useMock) {
            const record = [...mockStore.values()].find((r) => r.request_id === requestId);
            return record ?? null;
        }

        const { data, error } = await supabase
            .from('encoded_landholding_certificates')
            .select(`
                *,
                request:requests!encoded_landholding_certificates_request_id_fkey (
                    or_number,
                    payment_date,
                    authorized_signatory,
                    requested_by_name,
                    property_location
                ),
                properties:encoded_landholding_property_rows ( * )
            `)
            .eq('request_id', requestId)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            let sortedProperties = [];
            if (data.properties) {
                sortedProperties = data.properties
                    .sort((a, b) => a.row_order - b.row_order)
                    .map(this._normalizePropertyRow);
            }

            data.properties = sortedProperties;
            data.propertyRows = sortedProperties;

            if (data.request?.authorized_signatory) {
                const { data: sig } = await supabase
                    .from('signatories')
                    .select('name, title, role')
                    .eq('name', data.request.authorized_signatory)
                    .maybeSingle();

                data.request.signatoryDetails = sig;
            }
        }

        return data;
    }

    /**
     * Updates an existing certificate draft and syncs property rows.
     */
    async updateDraft(id, formData) {
        // 1. Update main certificate record
        const { data: cert, error: certErr } = await supabase
            .from('encoded_landholding_certificates')
            .update({
                declarant_name: formData.declarantName || formData.declarant_name,
                ownership_type: formData.ownershipType || formData.ownership_type,
                date_given: formData.dateGiven || formData.date_given,
                given_at: formData.givenAt || formData.given_at,
                purpose: formData.purpose,
            })
            .eq('id', id)
            .select()
            .single();

        if (certErr) throw certErr;

        // 2. Sync property rows
        const properties = formData.properties || formData.propertyRows || [];
        if (Array.isArray(properties)) {
            await supabase
                .from('encoded_landholding_property_rows')
                .delete()
                .eq('encoded_landholding_certificate_id', id);

            if (properties.length > 0) {
                const rowsToInsert = properties.map((row, idx) => ({
                    encoded_landholding_certificate_id: id,
                    row_order: idx,
                    td_arp_number: row.td_arp_number || row.tdArpNumber || row.tdNo || '',
                    location_of_property: row.location_of_property || row.locationOfProperty || row.location || null,
                    lot_number: row.lot_number || row.lotNumber || row.lotNo || null,
                    title_number: row.title_number || row.titleNumber || row.titleNo || null,
                    area: row.area ?? null,
                    assessed_value: row.assessed_value || row.assessedValue || row.assdValue || 0,
                }));

                const { error: insertRowsErr } = await supabase
                    .from('encoded_landholding_property_rows')
                    .insert(rowsToInsert);

                if (insertRowsErr) throw insertRowsErr;
            }
        }

        // 3. Update requested signatory in requests table if provided
        if (formData.signatory1Name && cert.request_id) {
            await supabase
                .from('requests')
                .update({ authorized_signatory: formData.signatory1Name })
                .eq('id', cert.request_id);
        }

        // 4. Fetch updated properties to return back
        const { data: refreshedProps, error: refreshErr } = await supabase
            .from('encoded_landholding_property_rows')
            .select('*')
            .eq('encoded_landholding_certificate_id', id)
            .order('row_order');

        if (refreshErr) throw refreshErr;

        const normalizedProps = refreshedProps.map(this._normalizePropertyRow);

        return { 
            ...cert, 
            properties: normalizedProps,
            propertyRows: normalizedProps
        };
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
            request: {
                or_number: 'MOCK-OR-123',
                payment_date: new Date().toISOString(),
                authorized_signatory: 'ENGR. VICENTE P. DESUY',
            },
            properties: data.propertyRows?.map((r, i) => this._normalizePropertyRow({ ...r, row_order: i })) ?? [],
        };
        mockStore.set(id, record);
        return record;
    }
}

export default new LandholdingService();