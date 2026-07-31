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
     *
     * FIX: previously hardcoded `activityTimeline: []` for every row, which
     * meant the frontend's findReleaseInfo() (in CertifiedTrueCopy.tsx) could
     * never find a "released" entry and always showed "—" for Date Released
     * / Released By. Now joins released_by → staff name (same pattern as
     * encoded_by) and, when the request is actually released, emits a real
     * activityTimeline entry the frontend can match on.
     */
    async getTransactionRegistry() {
        const { data: requests, error: reqErr } = await supabase
            .from('requests')
            .select('*, staff:encoded_by(first_name, last_name), released_staff:released_by(first_name, last_name)')
            .order('created_at', { ascending: false });

        if (reqErr) throw reqErr;

        const { data: docLinks } = await supabase
            .from('request_documents')
            .select('request_id, document_types(name)');

        const STATUS_MAP = {
            DRAFT: 'Pending',
            IN_PROGRESS: 'Processing',
            PAID: 'Payment Verified',
            RELEASED: 'Released',
            VOID: 'Void',
            CANCELLED: 'Cancelled',
            ARCHIVED: 'Archived',
        };

        return (requests || []).map((r) => {
            const documentNames = (docLinks || [])
                .filter((d) => d.request_id === r.id)
                .map((d) => d.document_types?.name)
                .filter(Boolean);

            const releasedByName = r.released_staff
                ? `${r.released_staff.first_name} ${r.released_staff.last_name}`
                : null;

            // Build a real activityTimeline only when the request has
            // actually been released and we know who released it.
            const activityTimeline = [];
            if (r.status === 'RELEASED' && releasedByName) {
                activityTimeline.push({
                    id: `${r.id}-released`,
                    action: 'Released by Staff',
                    actor: releasedByName,
                    date: r.released_at || r.updated_at || r.request_date,
                    time: '',
                });
            }

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
                activityTimeline,
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

    /**
     * FIX: now also records released_at, so getTransactionRegistry() has a
     * real timestamp to surface as the release date (previously only
     * status + released_by were set, leaving no date to show).
     */
    async markAsReleased(id, releasedByStaffId) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                status: 'RELEASED',
                released_by: releasedByStaffId,
                released_at: new Date().toISOString(),
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

    /**
     * Aggregates real-time dashboard metrics (access requests, transaction status breakdown, document type distribution) from Supabase.
     */
    async getDashboardMetrics() {
        const [{ data: requests }, { data: docLinks }, { data: docTypes }] = await Promise.all([
            supabase.from('requests').select('id, status, request_date, created_at, declarant_name, reference_number, property_location, encoded_by, staff:encoded_by(first_name, last_name)').order('created_at', { ascending: false }),
            supabase.from('request_documents').select('request_id, document_type_id, document_types(name, prefix)'),
            supabase.from('document_types').select('id, name, prefix'),
        ]);

        const allReqs = requests || [];

        // Transaction Summary Counts
        const totalCount = allReqs.length;
        const pendingCount = allReqs.filter(r => ['DRAFT', 'PENDING', 'SUBMITTED'].includes(r.status)).length;
        const verifiedCount = allReqs.filter(r => ['PAID', 'FOR_PAYMENT', 'IN_PROGRESS'].includes(r.status)).length;
        const releasedCount = allReqs.filter(r => ['RELEASED', 'APPROVED'].includes(r.status)).length;
        const voidCount = allReqs.filter(r => ['VOID', 'CANCELLED', 'REJECTED'].includes(r.status)).length;

        // NEW — feeds the "Document Request Queue" summary cards on the
        // Overview page (Request Today / Processing / Approved Documents /
        // Disapproved Documents). Kept as separate counts from
        // pendingCount/verifiedCount above, which mix several statuses
        // together for the (currently unused by the frontend) accessRequests
        // card set below — these two are purpose-built for the new cards.
        //   - requestedTodayCount: any request created/dated today, regardless
        //     of status.
        //   - processingCount: requests actively being worked (IN_PROGRESS).
        //   - "Approved Documents" reuses releasedCount, "Disapproved
        //     Documents" reuses voidCount — same status buckets, just
        //     surfaced under the labels shown in the reference design.
        const today = new Date();
        const isToday = (value) => {
            if (!value) return false;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return false;
            return date.getFullYear() === today.getFullYear()
                && date.getMonth() === today.getMonth()
                && date.getDate() === today.getDate();
        };
        const requestedTodayCount = allReqs.filter(r => isToday(r.request_date || r.created_at)).length;
        const processingCount = allReqs.filter(r => ['IN_PROGRESS'].includes(r.status)).length;

        // Document Distribution
        const docCounts = {};
        for (const link of docLinks || []) {
            const name = link.document_types?.name || 'General Certificate';
            docCounts[name] = (docCounts[name] || 0) + 1;
        }

        const totalDocLinks = Object.values(docCounts).reduce((a, b) => a + b, 0) || 1;
        const COLORS = ['#252175', '#00BCD4', '#4CAF50', '#FDD835', '#FF7043', '#9C27B0'];

        const distribution = Object.entries(docCounts).map(([label, count], index) => ({
            label,
            value: count,
            percentage: Math.round((count / totalDocLinks) * 100),
            color: COLORS[index % COLORS.length],
        }));

        // Access Requests Metrics Card Data
        const accessRequests = [
            { id: '1', title: 'Total Transactions', value: totalCount, change: '+100%', isPositive: true, variant: 'blue' },
            { id: '2', title: 'Pending Approval', value: pendingCount, change: 'Active', isPositive: true, variant: 'gold' },
            { id: '3', title: 'Verified / In-Progress', value: verifiedCount, change: 'Live', isPositive: true, variant: 'green' },
            { id: '4', title: 'Total Released', value: releasedCount, change: 'Completed', isPositive: true, variant: 'red' },
        ];

        // Request Queue (Top pending/in-progress items) — RAW per-request
        // rows. This is intentionally NOT the shape the Overview summary
        // cards need; it's meant for a detail list/table. The Overview
        // widget should be built from `summaryCounts` below instead.
        const STATUS_MAP = {
            DRAFT: 'Pending',
            PENDING: 'Pending',
            IN_PROGRESS: 'Processing',
            PAID: 'Payment Verified',
            RELEASED: 'Released',
            VOID: 'Void',
            CANCELLED: 'Cancelled',
        };

        const requestQueue = allReqs.map((r) => {
            const relDocs = (docLinks || []).filter(d => d.request_id === r.id).map(d => d.document_types?.name).filter(Boolean);
            const staffName = r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Unassigned';
            return {
                id: r.id,
                referenceNo: r.reference_number || `REF-${r.id.slice(0, 6).toUpperCase()}`,
                clientName: r.declarant_name || 'Anonymous Client',
                documentType: relDocs.join(', ') || 'No-Landholding Certificate',
                date: r.request_date ? new Date(r.request_date).toLocaleDateString() : new Date(r.created_at).toLocaleDateString(),
                assignedStaff: staffName,
                status: STATUS_MAP[r.status] || 'Pending',
            };
        });

        return {
            accessRequests,
            requestQueue,
            distribution: distribution.length > 0 ? distribution : [
                { label: 'No-Landholding Certificate', value: totalCount || 1, percentage: 100, color: '#252175' }
            ],
            summaryCounts: {
                totalCount,
                pendingCount,
                verifiedCount,
                releasedCount,
                voidCount,
                requestedTodayCount,
                processingCount,
            }
        };
    }

    /**
     * Aggregates reports and analytics dataset directly from Supabase.
     */
    async getReportsData() {
        const [{ data: requests }, { data: docLinks }] = await Promise.all([
            supabase.from('requests').select('*, staff:encoded_by(first_name, last_name)').order('created_at', { ascending: false }),
            supabase.from('request_documents').select('request_id, document_types(name)'),
        ]);

        const allReqs = requests || [];

        const totalDocuments = allReqs.length;
        const totalReleased = allReqs.filter(r => r.status === 'RELEASED').length;
        const totalPending = allReqs.filter(r => ['DRAFT', 'PENDING'].includes(r.status)).length;
        const totalPaid = allReqs.filter(r => r.status === 'PAID').length;

        const STATUS_LABEL_MAP = {
            DRAFT: 'Pending',
            PENDING: 'Pending',
            IN_PROGRESS: 'Processing',
            PAID: 'Payment Verified',
            RELEASED: 'Released',
            VOID: 'Void',
            CANCELLED: 'Cancelled',
        };

        const rows = allReqs.map(r => {
            const relDocs = (docLinks || []).filter(d => d.request_id === r.id).map(d => d.document_types?.name).filter(Boolean);
            const docName = relDocs.join(', ') || 'No-Landholding Certificate';
            const staffName = r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Office Staff';
            return {
                id: r.id,
                referenceNo: r.reference_number || `REF-${r.id.slice(0, 6).toUpperCase()}`,
                clientName: r.declarant_name || 'N/A',
                documentType: docName,
                requestedDate: r.request_date || r.created_at ? new Date(r.request_date || r.created_at).toISOString().split('T')[0] : '',
                processedBy: staffName,
                status: STATUS_LABEL_MAP[r.status] || 'Pending',
                orNumber: r.or_number || 'N/A',
            };
        });

        return {
            totalDocuments,
            totalReleased,
            totalPending,
            totalPaid,
            rows,
        };
    }
}

export default new RequestService();