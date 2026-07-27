import { supabase } from '../../config/supabase.js';

class RequestService {
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
        const [
            { data: municipalities },
            { data: barangays },
            { data: docTypes, error: docErr },
            { data: purposes },
            { data: staffRows }
        ] = await Promise.all([
            supabase.from('municipalities').select('id, name'),
            supabase.from('barangays').select('id, name, municipality_id'),
            supabase.from('document_types').select('id, name, prefix'),
            supabase.from('lookup_values').select('id, label, code'),
            supabase.from('staff').select('id, first_name, last_name'),
        ]);

        if (docErr) throw new Error(`Failed to load document types: ${docErr.message}`);

        return {
            municipalities: municipalities || [],
            barangays: barangays || [],
            docTypes: docTypes || [],
            purposes: purposes || [],
            staff: (staffRows || []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
        };
    }

    async createRequest(formData, staffId) {
        const uniqueRef = await this._generateReferenceNumber(formData.documentTypeIds);
        const { data: request, error: reqError } = await supabase
            .from('requests')
            .insert([{
                declarant_name: formData.declarantName,
                request_date: formData.requestDate,
                requested_by_name: formData.requestedByName,
                reference_number: uniqueRef,
                authorization_required: formData.authRequired,
                purpose_id: formData.purposeId || null,
                purpose_other_text: formData.purposeOtherText || null,
                action_taken: formData.actionTaken || 'PENDING',
                property_location: formData.propertyLocation || null, // Ensure this is saved
                encoded_by: staffId,
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

    async getRequestById(id) {
        const { data: request, error: reqError } = await supabase.from('requests').select('*').eq('id', id).single();
        if (reqError) throw reqError;

        const { data: docLinks } = await supabase.from('request_documents').select('document_type_id').eq('request_id', id);
        
        return {
            ...request,
            documentTypeIds: docLinks ? docLinks.map(link => link.document_type_id) : []
        };
    }

    async forwardRequest(requestId, { recipientStaffId, note, actorStaffId }) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                assigned_staff_id: recipientStaffId,
                forwarded_by: actorStaffId,
                forwarded_at: new Date().toISOString(),
                status: 'FORWARDED', // Fixes the "remains draft" bug
            })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        await supabase.from('notifications').insert([{
            request_id: requestId,
            actor_id: actorStaffId,
            recipient_id: recipientStaffId,
            message: note || 'forwarded a request to you',
            is_read: false,
        }]);

        return data;
    }

    async deleteRequest(id) {
        const { error } = await supabase.from('requests').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }
    
    // Add missing getRequests method for getAllRequests
    async getRequests() {
        const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateRequest(id, formData) {
        const updateData = {};

        // Map frontend camelCase to backend snake_case
        if (formData.status) updateData.status = formData.status;
        if (formData.declarantName) updateData.declarant_name = formData.declarantName;
        if (formData.requestedByName) updateData.requested_by_name = formData.requestedByName;
        if (formData.purposeId) updateData.purpose_id = formData.purposeId;
        if (formData.purposeOtherText !== undefined) updateData.purpose_other_text = formData.purposeOtherText;
        if (formData.actionTaken) updateData.action_taken = formData.actionTaken;
        if (formData.propertyLocation) updateData.property_location = formData.propertyLocation;
        if (formData.authRequired !== undefined) updateData.authorization_required = formData.authRequired;

        const { data, error } = await supabase
            .from('requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async forwardRequest(requestId, { recipientStaffId, note, actorStaffId }) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                assigned_staff_id: recipientStaffId,
                forwarded_by: actorStaffId,
                forwarded_at: new Date().toISOString(),
                status: 'FORWARDED',
            })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        await supabase.from('notifications').insert([{
            request_id: requestId,
            actor_id: actorStaffId,
            recipient_id: recipientStaffId,
            message: note || 'forwarded a request to you',
            is_read: false,
        }]);

        return data;
    }
}
export default new RequestService();