import { supabase } from '../../config/supabase.js';

class RequestService {
    async _getPrefixForDocType(docTypeId) {
        if (!docTypeId) return null;
        try {
            const { data } = await supabase.from('document_types').select('prefix').eq('id', docTypeId).single();
            return data?.prefix || null;
        } catch (e) {
            console.error('Prefix lookup error:', e.message);
            return null;
        }
    }

    async _generateReferenceNumber(documentTypeIds) {
        let prefix = 'REF';
        if (documentTypeIds && documentTypeIds.length > 0) {
            const fetchedPrefix = await this._getPrefixForDocType(documentTypeIds[0]);
            if (fetchedPrefix) prefix = fetchedPrefix;
        }
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

    // Replaces whatever was linked before with the current selection — this is
    // the piece that was missing, which is why a changed document type never
    // survived a save or a forward.
    async _syncRequestDocuments(requestId, documentTypeIds) {
        await supabase.from('request_documents').delete().eq('request_id', requestId);
        if (documentTypeIds && documentTypeIds.length) {
            const links = documentTypeIds.map(docId => ({ request_id: requestId, document_type_id: docId }));
            const { error } = await supabase.from('request_documents').insert(links);
            if (error) throw error;
        }
    }

    async createRequest(formData, staffId) {
        const uniqueRef = (formData.referenceNumber && !formData.referenceNumber.includes('XXXX'))
            ? formData.referenceNumber
            : await this._generateReferenceNumber(formData.documentTypeIds);

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
                property_location: formData.propertyLocation || null,
                encoded_by: staffId,
                status: formData.status || 'DRAFT'
            }])
            .select().single();

        if (reqError) throw reqError;

        if (formData.documentTypeIds?.length) {
            await this._syncRequestDocuments(request.id, formData.documentTypeIds);
        }
        return request;
    }

    async getRequests() {
        const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
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

    async updateRequest(id, formData) {
        const updateData = {};
        if (formData.status) updateData.status = formData.status;
        if (formData.declarantName) updateData.declarant_name = formData.declarantName;
        if (formData.requestedByName) updateData.requested_by_name = formData.requestedByName;
        if (formData.purposeId) updateData.purpose_id = formData.purposeId;
        if (formData.purposeOtherText !== undefined) updateData.purpose_other_text = formData.purposeOtherText;
        if (formData.actionTaken) updateData.action_taken = formData.actionTaken;
        if (formData.propertyLocation !== undefined) updateData.property_location = formData.propertyLocation;
        if (formData.authRequired !== undefined) updateData.authorization_required = formData.authRequired;

        // Keep the reference number's prefix matched to the document type being
        // saved, but only while it's still a placeholder — once finalized
        // (no more 'XXXX'), it stays permanent.
        if (formData.documentTypeIds?.length && formData.referenceNumber?.includes('XXXX')) {
            updateData.reference_number = await this._generateReferenceNumber(formData.documentTypeIds);
        }

        const { data, error } = await supabase.from('requests').update(updateData).eq('id', id).select().single();
        if (error) throw error;

        // Sync document type links on every update — this is what makes sure
        // whatever staff 1 last selected is what staff 2 actually receives.
        if (formData.documentTypeIds !== undefined) {
            await this._syncRequestDocuments(id, formData.documentTypeIds);
        }

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

    // FIXED: previously `note || 'forwarded a request to you'` replaced the
    // whole message when a note existed, dropping the "forwarded a request
    // to you" context entirely — the note is now appended instead.
    const message = note
        ? `forwarded a request to you — "${note}"`
        : 'forwarded a request to you';

    const { error: notifErr } = await supabase.from('notifications').insert([{
        request_id: requestId,
        actor_id: actorStaffId,
        recipient_id: recipientStaffId,
        message,
        is_read: false,
    }]);
    if (notifErr) throw notifErr;

    return data;
}
    async checkOrUniqueness(orNumber, excludeRequestId = null) {
        let query = supabase.from('requests').select('id, reference_number, declarant_name').eq('or_number', orNumber.trim());
        if (excludeRequestId) query = query.neq('id', excludeRequestId);
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
            return {
                isUnique: false,
                existingRequest: { referenceNumber: data[0].reference_number, declarantName: data[0].declarant_name }
            };
        }
        return { isUnique: true };
    }

    async releaseRequest(id, paymentData) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                or_number: paymentData.orNumber,
                authorized_signatory: paymentData.signatory,
                is_or_overridden: paymentData.isOverridden || false,
                or_override_justification: paymentData.justification || null,
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