import { supabase } from '../../config/supabase.js';

class NoLandholdingService {
    async saveNoLandholdingCertificate(data, staffAuthId, status = 'DRAFT') {
        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', staffAuthId)
            .single();

        if (staffErr || !staff) throw new Error('Staff profile not found.');

        const certPayload = {
            request_id: data.requestId,
            declarant_name: data.declarantName,
            pronoun: data.pronoun ?? 'His',
            property_count: data.propertyCount ?? 'singular',
            date_given: data.dateGiven || null,
            given_at: data.givenAt ?? null,
            purpose: data.purpose ?? null,
            print_as_ctc: data.printAsCtc ?? false,
            status,
            encoded_by: staff.id,
        };

        // Check if one already exists for this request to update, otherwise insert
        const { data: existing } = await supabase
            .from('encoded_no_landholding_certificates')
            .select('id')
            .eq('request_id', data.requestId)
            .maybeSingle();

        if (existing) {
            const { data: updated, error } = await supabase
                .from('encoded_no_landholding_certificates')
                .update(certPayload)
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return updated;
        } else {
            const { data: inserted, error } = await supabase
                .from('encoded_no_landholding_certificates')
                .insert([certPayload])
                .select()
                .single();
            if (error) throw error;
            return inserted;
        }
    }

    async getByRequestId(requestId) {
        const { data: cert, error: certErr } = await supabase
            .from('encoded_no_landholding_certificates')
            .select('*')
            .eq('request_id', requestId)
            .maybeSingle();

        if (certErr) throw certErr;
        if (!cert) return null;

        // Fetch expanded request details needed for PDF generation
        const { data: request, error: reqErr } = await supabase
            .from('requests')
            .select('requested_by_name, property_location, or_number, payment_date, authorized_signatory, reference_number')
            .eq('id', cert.request_id)
            .maybeSingle();

        if (reqErr) throw reqErr;

        // Fetch signatory info if an authorized signatory name exists on the request
        let signatoryDetails = null;
        if (request?.authorized_signatory) {
            const { data: sig } = await supabase
                .from('signatories')
                .select('name, title, role')
                .eq('name', request.authorized_signatory)
                .maybeSingle();

            signatoryDetails = sig;
        }

        return {
            ...cert,
            request: request
                ? {
                      ...request,
                      signatoryDetails,
                  }
                : null,
        };
    }

    async updateDraft(id, formData) {
        const { data, error } = await supabase.from('encoded_no_landholding_certificates').update({
            declarant_name: formData.declarantName || formData.declarant_name,
            pronoun: formData.pronoun,
            property_count: formData.propertyCount || formData.property_count,
            date_given: formData.dateGiven || formData.date_given,
            given_at: formData.givenAt || formData.given_at,
            purpose: formData.purpose
        }).eq('id', id).select().single();

        if (error) throw error;
        return data;
    }
}

export default new NoLandholdingService();