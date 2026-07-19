import { supabase } from '../../config/supabase.js';

class RequestService {
    // Generates Prefix-Year-Random (e.g., NLH-2026-1234)
    async _generateReferenceNumber(documentTypeIds) {
        let prefix = 'REF';
        try {
            if (documentTypeIds && documentTypeIds.length > 0) {
                const { data } = await supabase.from('document_types').select('prefix').eq('id', documentTypeIds[0]).single();
                if (data?.prefix) prefix = data.prefix;
            }
        } catch (e) { console.error("Prefix error:", e.message); }
        return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    async getMetadata() {
        const { data: municipalities } = await supabase.from('municipalities').select('id, name');
        const { data: barangays } = await supabase.from('barangays').select('id, name, municipality_id');
        const { data: docTypes } = await supabase.from('document_types').select('id, name, prefix');
        const { data: purposes } = await supabase.from('lookup_values').select('id, label, code');
        const { data: staffRows } = await supabase.from('staff').select('id, first_name, last_name');
        const staff = (staffRows ?? []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));

        return { municipalities: municipalities || [], barangays: barangays || [], docTypes: docTypes || [], purposes: purposes || [], staff: staff || [] };
    }

    async createRequest(formData, authUserId) {
        const { data: staff } = await supabase.from('staff').select('id').eq('auth_user_id', authUserId).single();
        if (!staff) throw new Error('Staff not found');

        const uniqueRef = await this._generateReferenceNumber(formData.documentTypeIds);

        const { data: request, error: reqError } = await supabase
            .from('requests')
            .insert([{
                declarant_name: formData.declarantName,
                request_date: formData.requestDate,
                requested_by_name: formData.requestedByName,
                reference_number: uniqueRef,
                authorization_required: formData.authRequired,
                // THIS LINE REGISTERS THE PURPOSE
                purpose_id: formData.purposeId || null,
                purpose_other_text: formData.purposeOtherText || null, 
                action_taken: formData.actionTaken || 'PENDING',
                encoded_by: staff.id,
                status: formData.status || 'DRAFT' 
            }])
            .select().single();

        if (reqError) throw reqError;

        if (formData.documentTypeIds?.length) {
            const links = formData.documentTypeIds.map(id => ({ request_id: request.id, document_type_id: id }));
            await supabase.from('request_documents').insert(links);
        }
        return request;
    }

    async getRequests() {
        try {
            const { data: requests, error: reqErr } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
            if (reqErr) throw reqErr;

            const { data: docLinks } = await supabase.from('request_documents').select('request_id, document_types(name)');

            return (requests || []).map(r => ({
                ...r,
                request_documents: (docLinks || []).filter(d => d.request_id === r.id)
            }));
        } catch (err) { return []; }
    }

    async updateRequest(id, formData) {
        // Robust update logic: handles status, names, and PURPOSE
        const updateData = {};
        
        if (formData.status) updateData.status = formData.status;
        
        if (formData.declarantName || formData.declarant_name) {
            updateData.declarant_name = formData.declarantName || formData.declarant_name;
        }
        
        if (formData.requestedByName || formData.requested_by_name) {
            updateData.requested_by_name = formData.requestedByName || formData.requested_by_name;
        }

        // FIX: ADDED PURPOSE UPDATING HERE
        if (formData.purposeId) updateData.purpose_id = formData.purposeId;
        if (formData.purposeOtherText !== undefined) updateData.purpose_other_text = formData.purposeOtherText;
        
        if (formData.action_taken || formData.actionTaken) {
            updateData.action_taken = formData.actionTaken || formData.action_taken;
        }

        const { data, error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    async releaseRequest(id, paymentData) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                or_number: paymentData.orNumber,
                authorized_signatory: paymentData.signatory,
                status: 'PAID', 
                payment_date: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteRequest(id) {
        await supabase.from('requests').delete().eq('id', id);
        return { id };
    }
}

export default new RequestService();