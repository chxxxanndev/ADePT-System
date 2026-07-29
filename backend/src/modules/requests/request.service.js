import { supabase } from '../../config/supabase.js';

class RequestService {
    // Helper to fetch prefix from DB
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

    // Generates Prefix-Year-Random (e.g., NLH-2026-1234)
    async _generateReferenceNumber(documentTypeIds) {
        let prefix = 'REF';
        if (documentTypeIds && documentTypeIds.length > 0) {
            const fetchedPrefix = await this._getPrefixForDocType(documentTypeIds[0]);
            if (fetchedPrefix) prefix = fetchedPrefix;
        }
        return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Helper to sync many-to-many relationship for document types
    async _syncRequestDocuments(requestId, documentTypeIds) {
        await supabase.from('request_documents').delete().eq('request_id', requestId);
        if (documentTypeIds && documentTypeIds.length) {
            const links = documentTypeIds.map(docId => ({ request_id: requestId, document_type_id: docId }));
            const { error } = await supabase.from('request_documents').insert(links);
            if (error) throw error;
        }
    }

    async getMetadata() {
        const [
            { data: municipalities },
            { data: barangays },
            { data: docTypes, error: docErr },
            { data: lookupValues, error: lookupErr },
            { data: staffRows }
        ] = await Promise.all([
            supabase.from('municipalities').select('id, name'),
            supabase.from('barangays').select('id, name, municipality_id'),
            supabase.from('document_types').select('id, name, prefix'),
            supabase.from('lookup_values').select('id, category, code, label').eq('is_active', true),
            supabase.from('staff').select('id, first_name, last_name'),
        ]);

        if (docErr) throw new Error(`Failed to load document types: ${docErr.message}`);
        if (lookupErr) throw new Error(`Failed to load lookup values: ${lookupErr.message}`);

        const classifications = (lookupValues || [])
            .filter((l) => l.category === 'CLASSIFICATION')
            .map((l) => ({ id: l.id, label: l.label, code: l.code }));

        const propertyTypes = (lookupValues || [])
            .filter((l) => l.category === 'PROPERTY_TYPE')
            .map((l) => ({ id: l.id, label: l.label, code: l.code }));

        return {
            municipalities: municipalities || [],
            barangays: barangays || [],
            docTypes: docTypes || [],
            purposes: [],
            staff: (staffRows || []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
            classifications,
            propertyTypes,
        };
    }

    async createRequest(formData, authUserId) {
        // Resolve staff ID securely from Auth User ID or payload
        let staffId = formData.encodedBy;
        if (!staffId && authUserId) {
            const { data: staff } = await supabase.from('staff').select('id').eq('auth_user_id', authUserId).single();
            if (staff) staffId = staff.id;
        }

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
                encoded_by: staffId, // Automatically assigning the logged-in staff
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
        try {
            // UPDATED: Added the join to the staff table for 'encoded_by'
            const { data: requests, error: reqErr } = await supabase
                .from('requests')
                .select('*, staff:encoded_by(first_name, last_name)')
                .order('created_at', { ascending: false });

            if (reqErr) throw reqErr;

            const { data: docLinks } = await supabase.from('request_documents').select('request_id, document_types(name)');

            return (requests || []).map(r => ({
                ...r,
                // Map the staff name so the Pending Payment frontend can read it!
                encoded_by_staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null,
                request_documents: (docLinks || []).filter(d => d.request_id === r.id)
            }));
        } catch (err) { return []; }
    }

    async getRequestById(id) {
        const { data: request, error: reqError } = await supabase.from('requests').select('*').eq('id', id).single();
        if (reqError) throw reqError;

        const { data: docLinks } = await supabase
            .from('request_documents')
            .select('document_type_id, document_types(name)')
            .eq('request_id', id);

        return {
            ...request,
            documentTypeIds: docLinks ? docLinks.map(link => link.document_type_id) : [],
            request_documents: docLinks || []
        };
    }

    /**
     * Returns requests shaped to match the frontend's Transaction type.
     * Combines logic from Code 1 with additional schema safety.
     */
    async getTransactionRegistry() {
        const { data: requests, error: reqErr } = await supabase
            .from('requests')
            .select('*, staff:encoded_by(first_name, last_name)')
            .order('created_at', { ascending: false });

        if (reqErr) throw reqErr;

        const { data: docLinks } = await supabase
            .from('request_documents')
            .select('request_id, document_types(name)');

        const STATUS_MAP = {
    DRAFT: 'Pending',
    IN_PROGRESS: 'Processing',
    PAID: 'Payment Verified',
    RELEASED: 'Released',   // ← added
    VOID: 'Void',
    CANCELLED: 'Cancelled',
    ARCHIVED: 'Archived',
};

        return (requests || []).map((r) => {
            const documentNames = (docLinks || [])
                .filter((d) => d.request_id === r.id)
                .map((d) => d.document_types?.name)
                .filter(Boolean);

            return {
                id: r.id,
                referenceNumber: r.reference_number,
                client: {
                    declarantName: r.declarant_name,
                    requestedBy: r.requested_by_name,
                    authorizationOnFile: !!r.authorization_required,
                },
                property: {
                    taxDeclarationNo: '', // TODO: Join tax_declarations
                    location: r.property_location || '',
                    ownerOnRecord: r.declarant_name,
                },
                requestedDocuments: documentNames,
                dateRequested: r.request_date,
                assignedStaff: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Unassigned',
                status: STATUS_MAP[r.status] || 'Pending',
                payment: {
                    orNumber: r.or_number || null,
                    amountDue: 0,
                    amountPaid: 0,
                    paymentDate: r.payment_date || null,
                    paymentMethod: r.or_number ? 'Cash' : 'Unpaid',
                    verifiedBy: r.authorized_signatory || null,
                },
                generatedDocuments: [],
                activityTimeline: [],
                reasonPurpose: r.purpose_other_text || '',
                isVoid: r.status === 'VOID',
                voidReason: r.status === 'VOID' ? (r.or_override_justification || '') : undefined,
            };
        });
    }

    async updateRequest(id, formData) {
        const updateData = {};

        // Handle field mappings from both codes
        if (formData.status) updateData.status = formData.status;
        if (formData.declarantName || formData.declarant_name) {
            updateData.declarant_name = formData.declarantName || formData.declarant_name;
        }
        if (formData.requestedByName || formData.requested_by_name) {
            updateData.requested_by_name = formData.requestedByName || formData.requested_by_name;
        }
        if (formData.purposeId) updateData.purpose_id = formData.purposeId;
        if (formData.purposeOtherText !== undefined) updateData.purpose_other_text = formData.purposeOtherText;
        if (formData.actionTaken || formData.action_taken) {
            updateData.action_taken = formData.actionTaken || formData.action_taken;
        }
        if (formData.propertyLocation !== undefined) updateData.property_location = formData.propertyLocation;
        if (formData.authRequired !== undefined) updateData.authorization_required = formData.authRequired;

        // Code 2 logic: Refresh ref number if it's still a placeholder
        if (formData.documentTypeIds?.length && (formData.referenceNumber?.includes('XXXX') || !formData.referenceNumber)) {
            updateData.reference_number = await this._generateReferenceNumber(formData.documentTypeIds);
        }

        const { data, error } = await supabase.from('requests').update(updateData).eq('id', id).select().single();
        if (error) throw error;

        // Sync document type links
        if (formData.documentTypeIds !== undefined) {
            await this._syncRequestDocuments(id, formData.documentTypeIds);
        }

        return data;
    }

    async forwardRequest(requestId, { recipientStaffId, note, actorStaffId }) {
        // 1. Update the request
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

        // 2. Format the notification message
        const message = note
            ? `forwarded a request to you — "${note}"`
            : 'forwarded a request to you';

        // 3. Insert the notification
        const { error: notifErr } = await supabase.from('notifications').insert([{
            request_id: requestId,
            actor_id: actorStaffId,
            recipient_id: recipientStaffId,
            message,
            is_read: false,
        }]);

        if (notifErr) {
            console.error("Notification failed:", notifErr.message);
            throw notifErr;
        }

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
        // request_documents usually has ON DELETE CASCADE, if not, manual deletion is needed
        await supabase.from('requests').delete().eq('id', id);
        return { id };
    }
}

export default new RequestService();