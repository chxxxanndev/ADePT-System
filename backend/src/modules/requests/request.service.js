import { supabase } from '../../config/supabase.js';

class RequestService {
    // 1. Helper to generate Prefix based on Document ID
    async _generateReferenceNumber(documentTypeIds) {
        let prefix = 'REF';
        if (documentTypeIds && documentTypeIds.length > 0) {
            const { data } = await supabase
                .from('document_types')
                .select('prefix')
                .eq('id', documentTypeIds[0])
                .single();
            if (data?.prefix) prefix = data.prefix;
        }
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${year}-${random}`;
    }

    // 2. Metadata for dropdowns
    async getMetadata() {
        const { data: municipalities } = await supabase.from('municipalities').select('id, name');
        const { data: barangays } = await supabase.from('barangays').select('id, name, municipality_id');
        const { data: docTypes } = await supabase.from('document_types').select('id, name, prefix');
        const { data: staffRows } = await supabase.from('staff').select('id, first_name, last_name');
        const staff = (staffRows ?? []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));

        return { municipalities: municipalities || [], barangays: barangays || [], docTypes: docTypes || [], staff: staff || [] };
    }

    // 3. Create Request (Fires when Proceed to Document is clicked)
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
                reference_number: uniqueRef, // Only column kept
                authorization_required: formData.authRequired,
                action_taken: formData.actionTaken || 'PENDING',
                encoded_by: staff.id,
                status: 'DRAFT'
            }])
            .select().single();

        if (reqError) throw reqError;

        if (formData.documentTypeIds?.length) {
            const links = formData.documentTypeIds.map(id => ({ request_id: request.id, document_type_id: id }));
            await supabase.from('request_documents').insert(links);
        }
        return request;
    }

    // 4. Update Request (Fixes the "is not a function" error)
    async updateRequest(id, formData) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                declarant_name: formData.declarantName || formData.declarant_name,
                requested_by_name: formData.requestedByName || formData.requested_by_name,
                status: formData.status || 'PENDING_PAYMENT'
            })
            .eq('id', id)
            .select().single();

        if (error) throw error;
        return data;
    }

    async getRequests() {
        const { data: requests, error: reqErr } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
        const { data: docLinks } = await supabase.from('request_documents').select('request_id, document_types(name)');

        return (requests || []).map(r => ({
            ...r,
            request_documents: (docLinks || []).filter(d => d.request_id === r.id)
        }));
    }

    async deleteRequest(id) {
        await supabase.from('requests').delete().eq('id', id);
        return { id };
    }
}

export default new RequestService();