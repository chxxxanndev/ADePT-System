import { supabase, useMock } from '../../config/supabase.js';

class RequestService {
    async getMetadata() {
        if (useMock || !supabase) {
            return {
                municipalities: [
                    { id: 'm1', name: 'Sibutad' },
                    { id: 'm2', name: 'Dapitan' },
                    { id: 'm3', name: 'Dipolog' },
                ],
                barangays: [
                    { id: 'b1', name: 'Pob. Sibutad', municipality_id: 'm1' },
                    { id: 'b2', name: 'Calamba', municipality_id: 'm1' },
                ],
                docTypes: [
                    { id: 'dt1', name: 'Certified True Copy of Latest Tax Declaration', prefix: 'TD' },
                    { id: 'dt2', name: 'Certified True Copy of Old Tax Declaration', prefix: 'CTC' },
                    { id: 'dt3', name: 'Certificate of Landholding', prefix: 'CLH' },
                ],
                purposes: [
                    { id: 'p1', name: 'For Settling of Tax Obligation', code: 'TAX_OBLIGATION' },
                    { id: 'p2', name: 'For Court and Other Legal Purposes', code: 'LEGAL' },
                    { id: 'p3', name: 'Others', code: 'OTHERS' },
                ],
                classifications: [
                    { id: 'c1', name: 'Agricultural', code: 'AGRICULTURAL' },
                    { id: 'c2', name: 'Residential', code: 'RESIDENTIAL' },
                    { id: 'c3', name: 'Commercial', code: 'COMMERCIAL' },
                    { id: 'c4', name: 'Industrial', code: 'INDUSTRIAL' },
                    { id: 'c5', name: 'Special', code: 'SPECIAL' },
                ],
                propertyTypes: [
                    { id: 'pt1', name: 'Land', code: 'LAND' },
                    { id: 'pt2', name: 'Building', code: 'BUILDING' },
                    { id: 'pt3', name: 'Machinery', code: 'MACHINERY' },
                    { id: 'pt4', name: 'Others', code: 'OTHERS' },
                ],
                staff: [
                    { id: 's1', name: 'Juan Dela Cruz' },
                    { id: 's2', name: 'Maria Santos' },
                ],
            };
        }

        const { data: municipalities } = await supabase.from('municipalities').select('id, name');
        const { data: barangays } = await supabase.from('barangays').select('id, name, municipality_id');
        const { data: docTypes } = await supabase.from('document_types').select('id, name, prefix');

        const { data: categories } = await supabase.from('lookup_categories').select('id, code');
        const { data: values } = await supabase
            .from('lookup_values')
            .select('id, category_id, code, label')
            .eq('is_active', true);

        const categoryMap = {};
        categories?.forEach((c) => { categoryMap[c.id] = c.code; });

        const purposes = [];
        const classifications = [];
        const propertyTypes = [];

        values?.forEach((v) => {
            const catCode = categoryMap[v.category_id];
            const entry = { id: v.id, name: v.label, code: v.code };
            if (catCode === 'PURPOSE') purposes.push(entry);
            else if (catCode === 'CLASSIFICATION') classifications.push(entry);
            else if (catCode === 'PROPERTY_TYPE') propertyTypes.push(entry);
        });

        const { data: staffRows } = await supabase
            .from('staff')
            .select('id, first_name, last_name')
            .eq('account_status', 'ACTIVE')
            .is('deleted_at', null);

        const staff = (staffRows ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));

        return { municipalities, barangays, docTypes, purposes, classifications, propertyTypes, staff };
    }

    async saveNewRequest(formData, authUserId) {
        const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('auth_user_id', authUserId)
            .eq('account_status', 'ACTIVE')
            .is('deleted_at', null)
            .single();

        if (!staff) throw new Error('Staff profile not found or inactive.');

        const insertPayload = {
            declarant_name: formData.declarantName,
            request_date: formData.requestDate,
            requested_by_name: formData.requestedByName,
            authorization_required: formData.authRequired,
            purpose_id: formData.purposeId || null,
            purpose_other_text: formData.purposeOtherText || null,   // ← add this
            action_taken: formData.actionTaken || 'PENDING',
            encoded_by: staff.id,
            status: 'DRAFT',
        };

        if (formData.releasingStaffId) insertPayload.released_by = formData.releasingStaffId;
        if (formData.releaseDate) insertPayload.archive_returned_date = formData.releaseDate;

        const { data: request, error: reqError } = await supabase
            .from('requests')
            .insert([insertPayload])
            .select()
            .single();

        if (reqError) throw reqError;

        if (formData.documentTypeIds?.length) {
            const docLinks = formData.documentTypeIds.map((docId) => ({
                request_id: request.id,
                document_type_id: docId,
            }));
            const { error: docError } = await supabase.from('request_documents').insert(docLinks);
            if (docError) throw docError;
        }

        return request;
    }

    /**
     * Updates an existing DRAFT request and reconciles its document type
     * selections.
     *
     * IMPORTANT caveat on document types: this only adds/removes rows in
     * request_documents that are still 'PENDING' (i.e. no PDF generated
     * yet). If a document type was deselected but already has a generated
     * PDF (status != 'PENDING'), it is deliberately left alone rather than
     * deleted — removing it would orphan generated_documents rows and
     * silently invalidate an already-issued document_number. Those are
     * reported back in `skippedRemovals` so the frontend/controller can
     * decide whether to surface a warning.
     */
    async updateRequest(requestId, formData) {
        const updatePayload = {
            declarant_name: formData.declarantName,
            request_date: formData.requestDate,
            requested_by_name: formData.requestedByName,
            authorization_required: formData.authRequired,
            purpose_id: formData.purposeId || null,
            purpose_other_text: formData.purposeOtherText || null,   // ← add this
            action_taken: formData.actionTaken || 'PENDING',
        };

        if (formData.status) {
        updatePayload.status = formData.status;
            }

            if (formData.releasingStaffId) updatePayload.released_by = formData.releasingStaffId;
            if (formData.releaseDate) updatePayload.archive_returned_date = formData.releaseDate;

        if (formData.releasingStaffId) updatePayload.released_by = formData.releasingStaffId;
        if (formData.releaseDate) updatePayload.archive_returned_date = formData.releaseDate;

        const { data: request, error: reqError } = await supabase
            .from('requests')
            .update(updatePayload)
            .eq('id', requestId)
            .select()
            .single();

        if (reqError) throw reqError;
        if (!request) throw new Error('REQUEST_NOT_FOUND');

        // Reconcile request_documents against the newly selected document types.
        const { data: existingDocs, error: fetchError } = await supabase
            .from('request_documents')
            .select('id, document_type_id, status')
            .eq('request_id', requestId);

        if (fetchError) throw fetchError;

        const newTypeIds = new Set(formData.documentTypeIds ?? []);
        const existingTypeIds = new Set((existingDocs ?? []).map((d) => d.document_type_id));

        const toAdd = [...newTypeIds].filter((t) => !existingTypeIds.has(t));
        const removable = (existingDocs ?? []).filter(
            (d) => !newTypeIds.has(d.document_type_id) && d.status === 'PENDING'
        );
        const skippedRemovals = (existingDocs ?? []).filter(
            (d) => !newTypeIds.has(d.document_type_id) && d.status !== 'PENDING'
        );

        if (toAdd.length) {
            const docLinks = toAdd.map((docId) => ({ request_id: requestId, document_type_id: docId }));
            const { error: addError } = await supabase.from('request_documents').insert(docLinks);
            if (addError) throw addError;
        }

        if (removable.length) {
            const { error: removeError } = await supabase
                .from('request_documents')
                .delete()
                .in('id', removable.map((r) => r.id));
            if (removeError) throw removeError;
        }

        return { ...request, skippedRemovals };
    }
}

export default new RequestService();