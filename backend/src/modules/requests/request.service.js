import { supabase } from '../../config/supabase.js';

class RequestService {
    // Generates Prefix-Year-Random (e.g., NLH-2026-1234)
    async _generateReferenceNumber(documentTypeIds) {
        let prefix = 'REF';
        if (documentTypeIds && documentTypeIds.length > 0) {
            const { data } = await supabase.from('document_types').select('prefix').eq('id', documentTypeIds[0]).single();
            if (data?.prefix) prefix = data.prefix;
        }
        return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Restore Dropdowns
    async getMetadata() {
        const { data: municipalities } = await supabase.from('municipalities').select('id, name');
        const { data: barangays } = await supabase.from('barangays').select('id, name, municipality_id');
        const { data: docTypes } = await supabase.from('document_types').select('id, name, prefix');
        const { data: purposes } = await supabase.from('lookup_values').select('id, label, code');
        const { data: staff } = await supabase.from('staff').select('id, first_name, last_name');
        return { municipalities, barangays, docTypes, purposes, staff: (staff || []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })) };
    }

    // Create: New Ref Number per Document
    async createRequest(formData, authUserId) {
        const { data: staff } = await supabase.from('staff').select('id').eq('auth_user_id', authUserId).single();
        const uniqueRef = await this._generateReferenceNumber(formData.documentTypeIds);

        const { data: request, error: reqError } = await supabase.from('requests').insert([{
            declarant_name: formData.declarantName,
            request_date: formData.requestDate,
            requested_by_name: formData.requestedByName,
            reference_number: uniqueRef,
            authorization_required: formData.authRequired,
            action_taken: formData.actionTaken || 'PENDING',
            encoded_by: staff?.id,
            status: formData.status || 'DRAFT' // Important: keeps it as DRAFT or sends to Payment
        }]).select().single();

        if (reqError) throw reqError;

        if (formData.documentTypeIds?.length) {
            const links = formData.documentTypeIds.map(id => ({ request_id: request.id, document_type_id: id }));
            await supabase.from('request_documents').insert(links);
        }
        return request;
    }

    // Get All: Resolves names for both Queue AND Drafts
    // backend/src/modules/requests/request.service.js

    async getRequests() {
        try {
            // STEP A: Fetch requests (Header data)
            const { data: requests, error: reqErr } = await supabase
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (reqErr) throw reqErr;

            // STEP B: Fetch associated document names via the link we just made in SQL
            const { data: docLinks } = await supabase
                .from('request_documents')
                .select('request_id, document_types(name)');

            // STEP C: Merge them so Frontend sees "documentType: 'Certificate of Landholding'"
            return (requests || []).map(r => ({
                ...r,
                request_documents: (docLinks || []).filter(d => d.request_id === r.id)
            }));
        } catch (err) {
            console.error('getRequests failed:', err.message);
            return [];
        }
    }

    async updateRequest(id, formData) {
        const { data, error } = await supabase.from('requests').update({
            declarant_name: formData.declarantName,
            requested_by_name: formData.requestedByName,
            action_taken: formData.actionTaken,
            status: formData.status
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRequest(id) {
        await supabase.from('requests').delete().eq('id', id);
        return { id };
    }
}
export default new RequestService();