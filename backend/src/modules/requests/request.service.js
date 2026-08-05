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
            staff: (staffRows || []).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })),
            classifications,
            propertyTypes,
        };
    }

    // Change this name in your BACKEND service file
    // Inside your Backend RequestService class
    async createRequest(formData, authUserId) {
        let staffId = formData.encodedBy;

        // Fallback if staffId is missing
        if (!staffId && authUserId) {
            const { data: staff } = await supabase.from('staff').select('id').eq('auth_user_id', authUserId).single();
            if (staff) staffId = staff.id;
        }

        // FIX: Allow all IDs (especially those starting with 'dt')
        const validDocTypeIds = (formData.documentTypeIds || []).filter(id => !!id);

        if (validDocTypeIds.length === 0) {
            throw new Error("Please select at least one Document Type.");
        }

        // Reference Number Logic
        const uniqueRef = (formData.referenceNumber && !formData.referenceNumber.includes('XXXX'))
            ? formData.referenceNumber
            : await this._generateReferenceNumber(validDocTypeIds);

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
                encoded_by: staffId,
                request_type: 'ORIGINAL',
                status: formData.status || 'DRAFT'
            }])
            .select().single();

        if (reqError) throw reqError;

        // Link documents
        if (validDocTypeIds.length) {
            await this._syncRequestDocuments(request.id, validDocTypeIds);
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

            const { data: docLinks } = await supabase
                .from('request_documents')
                .select('request_id, document_type_id, document_types(name)');

            return (requests || []).map(r => ({
                ...r,
                encoded_by_staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null,
                documentTypeIds: (docLinks || []).filter(d => d.request_id === r.id).map(d => d.document_type_id),
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
        const [
            { data: requests, error: reqErr },
            { data: docLinks },
            { data: barangays },
            { data: municipalities },
            { data: taxDeclarations },
            { data: assessmentRows },
            { data: lookupValues },
            { data: landholdingCerts },
            { data: landholdingRows },
            { data: noLandholdingCerts },
            { data: staffRows },
        ] = await Promise.all([
            supabase.from('requests').select('*, staff:encoded_by(first_name, last_name)').order('created_at', { ascending: false }),
            supabase.from('request_documents').select('id, request_id, document_type_id, encoded_tax_declaration_id, document_types(id, name, prefix, requires_tax_declaration)'),
            supabase.from('barangays').select('id, name, municipality_id'),
            supabase.from('municipalities').select('id, name'),
            supabase.from('encoded_tax_declarations').select(`
            id, request_id, tax_declaration_number, property_identification_number, arp_number,
            oct_tct_cloa_number, survey_number, lot_number, block_number,
            owner_name, owner_address, owner_tin, owner_telephone,
            administrator_name, administrator_address, administrator_tin, administrator_telephone,
            property_street, barangay_id, municipality_id,
            boundary_north, boundary_south, boundary_east, boundary_west,
            total_market_value, total_assessed_value, amount_in_words, taxability,
            effectivity_year, cancelled_td_number, memoranda, notes,
            assessor_name, assessor_title
        `),
            // Full column set — previously only id/encoded_tax_declaration_id/row_order/
            // classification_id/area were fetched, silently dropping actual_use_id,
            // actual_use_other_text, area_unit, per-row market_value/assessment_level/
            // assessed_value, and kind_of_property.
            supabase.from('encoded_assessment_rows').select(`
            id, encoded_tax_declaration_id, row_order, classification_id,
            actual_use_id, actual_use_other_text, area, area_unit,
            market_value, assessment_level, assessed_value, kind_of_property
        `),
            supabase.from('lookup_values').select('id, category, code, label'),
            supabase.from('encoded_landholding_certificates').select('id, request_id'),
            supabase.from('encoded_landholding_property_rows').select('id, encoded_landholding_certificate_id, row_order, td_arp_number, location_of_property, lot_number, title_number, area, assessed_value'),
            supabase.from('encoded_no_landholding_certificates').select('id, request_id'),
            supabase.from('staff').select('id, first_name, last_name'),
        ]);

        if (reqErr) throw reqErr;

        // UUID pattern check
        const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v || '');

        // Resolve barangay UUID → "Barangay, Municipality" label
        const resolveLocation = (raw) => {
            if (!raw || !isUuid(raw)) return raw || '';
            const barangay = (barangays || []).find((b) => b.id === raw);
            if (!barangay) return raw;
            const municipality = (municipalities || []).find((m) => m.id === barangay.municipality_id);
            return `${barangay.name}${municipality ? ', ' + municipality.name : ''}`;
        };

        const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

        // ── lookup maps for the new property sources ──
        const docsByRequestId = new Map();
        (docLinks || []).forEach((d) => {
            const list = docsByRequestId.get(d.request_id) || [];
            list.push(d);
            docsByRequestId.set(d.request_id, list);
        });

        const reprintCountByParentDocType = new Map();
        (requests || []).forEach((r) => {
            if (!r.parent_id) return;
            (docsByRequestId.get(r.id) || []).forEach((link) => {
                const key = `${r.parent_id}::${link.document_type_id}`;
                reprintCountByParentDocType.set(key, (reprintCountByParentDocType.get(key) || 0) + 1);
            });
        });

        const amendedOriginalIds = new Set(
            (requests || [])
                .filter((r) =>
                    r.amended_from_id &&
                    r.status !== 'DRAFT' &&
                    !['CANCELLED'].includes(r.status)
                )
                .map((r) => r.amended_from_id)
        );

        const taxDecById = new Map((taxDeclarations || []).map((td) => [td.id, td]));
        const taxDecByRequestId = new Map();
        (taxDeclarations || []).forEach((td) => {
            if (!taxDecByRequestId.has(td.request_id)) taxDecByRequestId.set(td.request_id, td);
        });

        const assessmentRowsByTdId = new Map();
        [...(assessmentRows || [])]
            .sort((a, b) => (a.row_order || 0) - (b.row_order || 0))
            .forEach((row) => {
                const list = assessmentRowsByTdId.get(row.encoded_tax_declaration_id) || [];
                list.push(row);
                assessmentRowsByTdId.set(row.encoded_tax_declaration_id, list);
            });
        // classification_id and actual_use_id both reference lookup_values, so
        // the same id→label map serves both.
        const lookupById = new Map((lookupValues || []).map((l) => [l.id, l]));

        const landholdingCertByRequestId = new Map();
        (landholdingCerts || []).forEach((c) => {
            if (!landholdingCertByRequestId.has(c.request_id)) landholdingCertByRequestId.set(c.request_id, c);
        });
        const landholdingRowsByCertId = new Map();
        [...(landholdingRows || [])]
            .sort((a, b) => (a.row_order || 0) - (b.row_order || 0))
            .forEach((row) => {
                const list = landholdingRowsByCertId.get(row.encoded_landholding_certificate_id) || [];
                list.push(row);
                landholdingRowsByCertId.set(row.encoded_landholding_certificate_id, list);
            });

        const noLandholdingRequestIds = new Set((noLandholdingCerts || []).map((c) => c.request_id));

        // Used to resolve `authorized_signatory` (often a staff uuid) into a display name.
        const staffById = new Map((staffRows || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]));

        const STATUS_MAP = {
            DRAFT: 'Pending',
            PENDING_PAYMENT: 'Pending',
            PENDING: 'Pending',
            FOR_PAYMENT: 'For Payment',
            IN_PROGRESS: 'Processing',
            PAID: 'Payment Verified',
            PAYMENT_VERIFIED: 'Payment Verified',
            READY_FOR_RELEASE: 'Ready for Release',
            RELEASED: 'Released',
            RELEASED_PENDING_VERIFICATION: 'Released',
            FORWARDED: 'Processing',
            VOID: 'Void',
            VOIDED: 'Void',
            CANCELLED: 'Cancelled',
            ARCHIVED: 'Archived',
        };

        return (requests || []).map((r) => {
            const reqDocs = docsByRequestId.get(r.id) || [];

            // Live document types (id + name + whether it needs a tax dec),
            // instead of hardcoded strings.
            const documentEntries = reqDocs.map((d) => ({
                id: d.id,
                documentTypeId: d.document_type_id,
                name: d.document_types?.name || 'Document',
                requiresTaxDeclaration: !!d.document_types?.requires_tax_declaration,
                reprintCount: reprintCountByParentDocType.get(`${r.id}::${d.document_type_id}`) || 0,   // NEW
            }));
            // ── Resolve Property Information ──
            let property = {
                source: 'UNKNOWN',
                taxDeclarationNo: '',
                pin: '',
                octTctNumber: '',
                surveyNumber: '',
                lotNo: '',
                blockNumber: '',
                titleNumber: '',
                location: resolveLocation(r.property_location),
                ownerOnRecord: r.declarant_name,
                ownerAddress: '',
                ownerTin: '',
                ownerTelephone: '',
                administratorName: '',
                administratorAddress: '',
                administratorTin: '',
                administratorTelephone: '',
                boundaryNorth: '',
                boundarySouth: '',
                boundaryEast: '',
                boundaryWest: '',
                classification: '',
                area: '',
                marketValue: null,
                assessedValue: null,
                taxability: '',
                amountInWords: '',
                effectivityYear: null,
                cancelledTdNumber: '',
                memoranda: '',
                notes: '',
                assessorName: '',
                assessorTitle: '',
                assessmentRows: [],
            };

            // Prefer the tax declaration a specific requested document points to
            // (request_documents.encoded_tax_declaration_id); fall back to any
            // tax dec on this request.
            const directTdId = reqDocs.map((d) => d.encoded_tax_declaration_id).find(Boolean);
            const td = (directTdId && taxDecById.get(directTdId)) || taxDecByRequestId.get(r.id);

            if (td) {
                const rows = assessmentRowsByTdId.get(td.id) || [];
                const firstRow = rows[0]; // used only for the top-level classification/area summary fields
                const classification = firstRow
                    ? (lookupById.get(firstRow.classification_id)?.label || firstRow.classification_id || '')
                    : '';

                // Full row list — no longer dropped after the first row.
                const assessmentRowEntries = rows.map((row) => ({
                    id: row.id,
                    rowOrder: row.row_order,
                    classification: lookupById.get(row.classification_id)?.label || row.classification_id || '',
                    actualUse: lookupById.get(row.actual_use_id)?.label || row.actual_use_id || '',
                    actualUseOtherText: row.actual_use_other_text || '',
                    area: row.area || '',
                    areaUnit: row.area_unit || '',
                    marketValue: toNum(row.market_value),
                    assessmentLevel: toNum(row.assessment_level),
                    assessedValue: toNum(row.assessed_value),
                    kindOfProperty: row.kind_of_property || '',
                }));

                const barangay = (barangays || []).find((b) => b.id === td.barangay_id);
                const municipality = (municipalities || []).find((m) => m.id === td.municipality_id);
                const tdLocationParts = [td.property_street, barangay?.name, municipality?.name].filter(Boolean);

                property = {
                    ...property,
                    source: 'TAX_DECLARATION',
                    taxDeclarationNo: td.tax_declaration_number || td.arp_number || '',
                    pin: td.property_identification_number || '',
                    octTctNumber: td.oct_tct_cloa_number || '',
                    surveyNumber: td.survey_number || '',
                    lotNo: td.lot_number || '',
                    blockNumber: td.block_number || '',
                    titleNumber: td.oct_tct_cloa_number || '',
                    location: tdLocationParts.length ? tdLocationParts.join(', ') : property.location,
                    ownerOnRecord: td.owner_name || r.declarant_name,
                    ownerAddress: td.owner_address || '',
                    ownerTin: td.owner_tin || '',
                    ownerTelephone: td.owner_telephone || '',
                    administratorName: td.administrator_name || '',
                    administratorAddress: td.administrator_address || '',
                    administratorTin: td.administrator_tin || '',
                    administratorTelephone: td.administrator_telephone || '',
                    boundaryNorth: td.boundary_north || '',
                    boundarySouth: td.boundary_south || '',
                    boundaryEast: td.boundary_east || '',
                    boundaryWest: td.boundary_west || '',
                    classification,
                    area: firstRow?.area || '',
                    marketValue: toNum(td.total_market_value),
                    assessedValue: toNum(td.total_assessed_value),
                    taxability: td.taxability || '',
                    amountInWords: td.amount_in_words || '',
                    effectivityYear: toNum(td.effectivity_year),
                    cancelledTdNumber: td.cancelled_td_number || '',
                    memoranda: td.memoranda || '',
                    notes: td.notes || '',
                    assessorName: td.assessor_name || '',
                    assessorTitle: td.assessor_title || '',
                    assessmentRows: assessmentRowEntries,
                };
            } else {
                const lhCert = landholdingCertByRequestId.get(r.id);
                if (lhCert) {
                    const rows = landholdingRowsByCertId.get(lhCert.id) || [];
                    const first = rows[0];

                    const landholdingRowEntries = rows.map((row, idx) => ({
                        id: row.id,
                        rowOrder: row.row_order ?? idx + 1,
                        tdArpNumber: row.td_arp_number || '',
                        location: row.location_of_property || '',
                        lotNumber: row.lot_number || '',
                        titleNumber: row.title_number || '',
                        area: row.area || '',
                        assessedValue: toNum(row.assessed_value),
                    }));

                    const totalAssessedValue = rows.reduce(
                        (sum, row) => sum + (toNum(row.assessed_value) || 0),
                        0
                    );

                    property = {
                        ...property,
                        source: 'LAND_HOLDING',
                        taxDeclarationNo: first?.td_arp_number || '',
                        lotNo: first?.lot_number || '',
                        titleNumber: first?.title_number || '',
                        location: first?.location_of_property || property.location,
                        area: first?.area || '',
                        assessedValue: rows.length ? totalAssessedValue : null,   // ← use the sum
                        ownerOnRecord: r.declarant_name,
                        landholdingRows: landholdingRowEntries,                   // ← ADD THIS LINE
                    };
                } else if (noLandholdingRequestIds.has(r.id)) {
                    property = {
                        ...property,
                        source: 'NO_LANDHOLDING',
                        location: '',
                        ownerOnRecord: '',
                    };
                }
            }

            const amountDue = reqDocs.length * 40;
            const amountPaid = r.or_number ? amountDue : 0;

            const resolvedVerifiedBy = r.authorized_signatory && isUuid(r.authorized_signatory)
                ? (staffById.get(r.authorized_signatory) || r.authorized_signatory)
                : r.authorized_signatory;

            const resolvedReleasedBy = r.released_by && isUuid(r.released_by)
                ? (staffById.get(r.released_by) || r.released_by)
                : r.released_by;

            return {
                id: r.id,
                referenceNumber: r.reference_number,
                requestType: r.request_type,
                hasBeenAmended: amendedOriginalIds.has(r.id),
                client: {
                    declarantName: r.declarant_name,
                    requestedBy: r.requested_by_name,
                    address: r.client_address || undefined,
                    authorizationOnFile: !!r.authorization_required,
                },
                property,
                requestedDocuments: documentEntries,
                dateRequested: r.request_date,
                // released_at is a timestamptz (e.g. "2026-01-15T08:23:00.000Z"),
                // trimmed to just the date portion so it displays consistently
                // alongside dateRequested (a plain `date` column). Set once by
                // whatever handler flips status → Released via released_by, so
                // (unlike updated_at) it won't drift on later unrelated edits.
                dateReleased: r.released_at ? r.released_at.split('T')[0] : null,
                releasedBy: resolvedReleasedBy || null,
                assignedStaff: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Unassigned',
                status: STATUS_MAP[r.status] || r.status,
                payment: {
                    orNumber: r.or_number || null,
                    amountDue,
                    amountPaid,
                    paymentDate: r.payment_date || null,
                    paymentMethod: r.or_number ? 'Cash' : 'Unpaid',
                    verifiedBy: resolvedVerifiedBy || null,
                    orJustification: r.or_override_justification || null,
                },
                generatedDocuments: documentEntries.map((d) => ({
                    id: d.id,
                    documentName: d.name,
                    documentType: d.name,
                    dateGenerated: r.payment_date || r.request_date,
                    generatedBy: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Unassigned',
                    fileRef: d.documentTypeId || d.id,
                })),
                activityTimeline: [],
                isVoid: r.status === 'VOID' || r.status === 'VOIDED',
                voidReason: (r.status === 'VOID' || r.status === 'VOIDED') ? (r.void_reason || '') : undefined,
                voidedAt: (r.status === 'VOID' || r.status === 'VOIDED') ? (r.updated_at || null) : undefined,
                cancelledAt: r.status === 'CANCELLED' ? (r.updated_at || null) : undefined,
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

        if (formData.status) {
            updateData.status = formData.status;
            if (formData.status === 'PENDING_PAYMENT') {
                updateData.pending_payment_at = new Date().toISOString();
            }
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

    async markAsReleased(id, releasedBy) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                status: 'RELEASED',
                released_by: releasedBy,
                released_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Inside your RequestService class in the backend file

    async updateStatus(id, updateData) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                // Match the UI request to your DB columns
                status: updateData.status,
                authorized_signatory: updateData.releasedBy,
                payment_date: updateData.releasedAt,
                // You can also store the specific signatory IDs if you have columns for them
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Inside RequestService.js

    async createReprint(originalRequestId, docId) {
        // 1. Get the document link
        const { data: link, error: linkErr } = await supabase
            .from('request_documents')
            .select('document_type_id, document_types(name, prefix)')
            .eq('id', docId)
            .single();

        if (linkErr) throw new Error(`Document Link not found: ${linkErr.message}`);

        // 2. Get the original request
        const { data: original, error: origErr } = await supabase
            .from('requests')
            .select('*')
            .eq('id', originalRequestId)
            .single();

        if (origErr) throw new Error(`Original Request not found: ${origErr.message}`);

        const rootId = original.parent_id || original.id;

        // 3. Count siblings for the -R1, -R2 suffix
        const { data: siblings } = await supabase
            .from('requests')
            .select('id')
            .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

        const reprintNumber = (siblings?.length || 0);
        const baseRef = (original.reference_number || '').replace(/-R\d+$/, '');
        const newRef = `${baseRef}-R${reprintNumber}`;

        // 4. Create the new request record
        const { data: reprint, error: insErr } = await supabase
            .from('requests')
            .insert([{
                declarant_name: original.declarant_name,
                requested_by_name: original.requested_by_name,
                reference_number: newRef,
                authorization_required: original.authorization_required,
                property_location: original.property_location,
                encoded_by: original.encoded_by,
                request_date: new Date().toISOString().split('T')[0],
                status: 'PENDING_PAYMENT',
                pending_payment_at: new Date().toISOString(),
                request_type: 'REPRINT',
                parent_id: rootId,
            }])
            .select()
            .single();

        if (insErr) throw insErr;

        // 5. Link the specific document being reprinted
        await this._syncRequestDocuments(reprint.id, [link.document_type_id]);

        // 6. Copy underlying data based on prefix
        const docPrefix = link.document_types?.prefix;
        if (docPrefix === 'LH') {
            await this._copyLandholdingCertificate(originalRequestId, reprint.id);
        } else if (docPrefix === 'TD') {
            await this._copyTaxDeclaration(originalRequestId, reprint.id);
        } else if (docPrefix === 'NLH') {
            // Use the updated fix for NLH from previous step
            await this._copyNoLandholdingCertificate(originalRequestId, reprint.id);
        }

        return reprint;
    }

    async _copyNoLandholdingCertificate(originalRequestId, newRequestId) {
        // We use .maybeSingle() instead of .single() to prevent crashing if record is missing
        const { data: origCert, error: fetchErr } = await supabase
            .from('encoded_no_landholding_certificates')
            .select('*')
            .eq('request_id', originalRequestId)
            .maybeSingle();

        if (fetchErr) throw fetchErr;

        // If the original certificate doesn't exist yet, we can't copy it. 
        // We just create a fresh link for the new request.
        if (!origCert) {
            await supabase.from('encoded_no_landholding_certificates').insert([{ request_id: newRequestId }]);
            return;
        }

        const { id: _i, created_at: _c, updated_at: _u, request_id: _r, ...fields } = origCert;
        const { error: insErr } = await supabase
            .from('encoded_no_landholding_certificates')
            .insert([{ ...fields, request_id: newRequestId }]);

        if (insErr) throw insErr;
    }

    // Deep-copies an encoded_landholding_certificates row (+ its property rows)
    // from the original request onto the new reprint request, so PaymentDetails
    // can regenerate an identical PDF without depending on the original record.
    async _copyLandholdingCertificate(originalRequestId, newRequestId) {
        const { data: origCert, error: certErr } = await supabase
            .from('encoded_landholding_certificates')
            .select('*')
            .eq('request_id', originalRequestId)
            .single();
        if (certErr || !origCert) {
            console.error('No landholding certificate found to copy for reprint:', certErr?.message);
            return;
        }

        const { id: _omit, request_id: _omit2, created_at: _omit3, updated_at: _omit4, ...certFields } = origCert;

        const { data: newCert, error: insCertErr } = await supabase
            .from('encoded_landholding_certificates')
            .insert([{ ...certFields, request_id: newRequestId }])
            .select()
            .single();
        if (insCertErr) throw insCertErr;

        const { data: origRows, error: rowsErr } = await supabase
            .from('encoded_landholding_property_rows')
            .select('*')
            .eq('encoded_landholding_certificate_id', origCert.id);
        if (rowsErr) throw rowsErr;

        if (origRows && origRows.length) {
            const newRows = origRows.map(({ id, encoded_landholding_certificate_id, ...rowFields }) => ({
                ...rowFields,
                encoded_landholding_certificate_id: newCert.id,
            }));
            const { error: insRowsErr } = await supabase
                .from('encoded_landholding_property_rows')
                .insert(newRows);
            if (insRowsErr) throw insRowsErr;
        }
    }

    // Same idea for Tax Declarations — copies the encoded_tax_declarations row
    // AND its encoded_assessment_rows.
    async _copyTaxDeclaration(originalRequestId, newRequestId) {
        const { data: origTd, error: tdErr } = await supabase
            .from('encoded_tax_declarations')
            .select('*')
            .eq('request_id', originalRequestId)
            .single();
        if (tdErr || !origTd) {
            console.error('No tax declaration found to copy for reprint:', tdErr?.message);
            return;
        }

        const { id: _omit, request_id: _omit2, created_at: _omit3, updated_at: _omit4, ...tdFields } = origTd;

        const { data: newTd, error: insTdErr } = await supabase
            .from('encoded_tax_declarations')
            .insert([{ ...tdFields, request_id: newRequestId }])
            .select()
            .single();
        if (insTdErr) throw insTdErr;

        const { data: origRows, error: rowsErr } = await supabase
            .from('encoded_assessment_rows')
            .select('*')
            .eq('encoded_tax_declaration_id', origTd.id);
        if (rowsErr) throw rowsErr;

        if (origRows && origRows.length) {
            const newRows = origRows.map(({ id, encoded_tax_declaration_id, ...rowFields }) => ({
                ...rowFields,
                encoded_tax_declaration_id: newTd.id,
            }));
            const { error: insRowsErr } = await supabase
                .from('encoded_assessment_rows')
                .insert(newRows);
            if (insRowsErr) throw insRowsErr;
        }
    }

    async voidRequest(id, reason) {
        const { data, error } = await supabase
            .from('requests')
            .update({
                status: 'VOID',
                void_reason: reason || 'Voided by staff',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ── Amend ─────────────────────────────────────────────────────────────

    /**
     * Clones a voided (or any) request into a brand-new, fully editable
     * DRAFT request with a new control number, so staff can walk back
     * through the normal intake + document-fill flow with everything
     * pre-populated. Reuses the same deep-copy helpers createReprint() uses.
     */

    async amendRequest(originalRequestId, staffId) {
        if (!staffId) {
            throw new Error('Could not identify the current staff member — cannot amend.');
        }

        const [
            { data: original, error: origErr },
            { data: docLink, error: docErr },
        ] = await Promise.all([
            supabase.from('requests').select('*').eq('id', originalRequestId).single(),
            supabase.from('request_documents')
                .select('document_type_id, document_types(id, name, prefix)')
                .eq('request_id', originalRequestId)
                .limit(1)
                .maybeSingle(),
        ]);

        if (origErr || !original) throw new Error(`Original request not found: ${origErr?.message}`);
        if (docErr) throw docErr;
        if (!docLink) throw new Error('Original request has no document type on file — cannot amend.');

        const newRef = await this._generateReferenceNumber([docLink.document_type_id]);
        const { data: amended, error: insErr } = await supabase
            .from('requests')
            .insert([{
                declarant_name: original.declarant_name,
                requested_by_name: original.requested_by_name,
                reference_number: newRef,
                authorization_required: original.authorization_required,
                action_taken: 'PENDING',
                property_location: original.property_location,
                encoded_by: staffId,
                request_date: new Date().toISOString().split('T')[0],
                status: 'DRAFT',
                request_type: 'ORIGINAL',
                amended_from_id: originalRequestId,
            }])
            .select()
            .single();
        if (insErr) throw insErr;

        const prefix = docLink.document_types?.prefix;
        const copyPromise =
            prefix === 'LH' ? this._copyLandholdingCertificate(originalRequestId, amended.id)
                : prefix === 'TD' ? this._copyTaxDeclaration(originalRequestId, amended.id)
                    : prefix === 'NLH' ? this._copyNoLandholdingCertificate(originalRequestId, amended.id)
                        : Promise.resolve();

        await Promise.all([
            this._syncRequestDocuments(amended.id, [docLink.document_type_id]),
            copyPromise,
        ]);

        if (prefix === 'LH') {
            await supabase.from('encoded_landholding_certificates').update({ encoded_by: staffId }).eq('request_id', amended.id);
        } else if (prefix === 'TD') {
            await supabase.from('encoded_tax_declarations').update({ encoded_by: staffId }).eq('request_id', amended.id);
        } else if (prefix === 'NLH') {
            await supabase.from('encoded_no_landholding_certificates').update({ encoded_by: staffId }).eq('request_id', amended.id);
        }

        return {
            request: amended,
            documentTypeId: docLink.document_type_id,
            documentTypeName: docLink.document_types?.name,
            documentPrefix: prefix,
        };
    }

    /**
     * Reads back whatever document-specific data already exists for a
     * request (used right after amendRequest's deep-copy, so the intake →
     * document-fill forms can open pre-populated instead of blank).
     *
     * ⚠️ Column names for LH/NLH below are inferred from how the frontend
     * calls saveCertificate() — verify against your actual schema.
     */
    async getDocumentDataByRequestId(requestId) {
        const [{ data: td }, { data: lhCert }, { data: nlhCert }] = await Promise.all([
            supabase.from('encoded_tax_declarations').select('*').eq('request_id', requestId).maybeSingle(),
            supabase.from('encoded_landholding_certificates').select('*').eq('request_id', requestId).maybeSingle(),
            supabase.from('encoded_no_landholding_certificates').select('*').eq('request_id', requestId).maybeSingle(),
        ]);

        if (td) {
            const { data: rows } = await supabase
                .from('encoded_assessment_rows')
                .select('*')
                .eq('encoded_tax_declaration_id', td.id)
                .order('row_order', { ascending: true });

            return {
                documentPrefix: 'TD',
                data: {
                    taxDeclarationNumber: td.tax_declaration_number || '',
                    propertyIndexNumber: td.property_identification_number || '',
                    ownerName: td.owner_name || '',
                    ownerAddress: td.owner_address || '',
                    administratorName: td.administrator_name || '',
                    administratorAddress: td.administrator_address || '',
                    octTctNumber: td.oct_tct_cloa_number || '',
                    surveyNumber: td.survey_number || '',
                    lotNumber: td.lot_number || '',
                    blockNumber: td.block_number || '',
                    boundaryNorth: td.boundary_north || '',
                    boundarySouth: td.boundary_south || '',
                    boundaryEast: td.boundary_east || '',
                    boundaryWest: td.boundary_west || '',
                    taxability: td.taxability || 'TAXABLE',
                    effectivityYear: td.effectivity_year ? String(td.effectivity_year) : '',
                    arpNumber: td.cancelled_td_number || '',
                    memoranda: td.memoranda || '',
                    assessorName: td.assessor_name || '',
                    assessorTitle: td.assessor_title || '',
                    assessmentRows: (rows || []).map((r) => ({
                        id: r.id,
                        kindOfProperty: r.kind_of_property || '',
                        classificationId: r.classification_id || '',
                        classificationLabel: '',
                        marketValue: r.market_value != null ? String(r.market_value) : '',
                        assessmentLevel: r.assessment_level != null ? String(r.assessment_level) : '',
                        assessedValue: r.assessed_value != null ? String(r.assessed_value) : '',
                        area: r.area || '',
                    })),
                },
            };
        }

        if (lhCert) {
            const { data: rows } = await supabase
                .from('encoded_landholding_property_rows')
                .select('*')
                .eq('encoded_landholding_certificate_id', lhCert.id)
                .order('row_order', { ascending: true });

            return {
                documentPrefix: 'LH',
                data: {
                    declarantName: lhCert.declarant_name || '',
                    ownershipType: lhCert.ownership_type || 'single',
                    dateGiven: lhCert.date_given || '',
                    givenAt: lhCert.given_at || '',
                    purpose: lhCert.purpose || '',
                    propertyRows: (rows || []).map((r) => ({
                        id: r.id,
                        tdArpNumber: r.td_arp_number || '',
                        locationOfProperty: r.location_of_property || '',
                        lotNumber: r.lot_number || '',
                        titleNumber: r.title_number || '',
                        area: r.area || '',
                        assessedValue: r.assessed_value != null ? String(r.assessed_value) : '',
                    })),
                },
            };
        }

        if (nlhCert) {
            return {
                documentPrefix: 'NLH',
                data: {
                    declarantName: nlhCert.declarant_name || '',
                    pronoun: nlhCert.pronoun || 'His',
                    propertyCount: nlhCert.property_count || 'singular',
                    dateGiven: nlhCert.date_given || '',
                    givenAt: nlhCert.given_at || '',
                    purpose: nlhCert.purpose || '',
                },
            };
        }

        return null;
    }

    async deleteRequest(id) {
        // request_documents usually has ON DELETE CASCADE, if not, manual deletion is needed
        await supabase.from('requests').delete().eq('id', id);
        return { id };
    }

    /**
     * Aggregates real-time dashboard metrics (access requests, transaction status breakdown, document type distribution) from Supabase.
     */
    async getDashboardMetrics(from, to) {
        let requestsQuery = supabase
            .from('requests')
            .select('id, status, request_date, created_at, declarant_name, reference_number, property_location, encoded_by, staff:encoded_by(first_name, last_name)')
            .order('created_at', { ascending: false });
        if (from) requestsQuery = requestsQuery.gte('request_date', from);
        if (to) requestsQuery = requestsQuery.lte('request_date', to);

        const [{ data: requests }, { data: docLinks }, { data: docTypes }] = await Promise.all([
            requestsQuery,
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

        // When a date range is selected, "Request Today" becomes "requests
        // in the selected range" — the SQL query already filtered to it.
        // Without a range, fall back to counting only today's requests.
        const requestedTodayCount = (from && to)
            ? allReqs.length
            : allReqs.filter(r => isToday(r.request_date || r.created_at)).length;
        const processingCount = allReqs.filter(r => ['IN_PROGRESS'].includes(r.status)).length;

        // Document Distribution
        const validReqIds = new Set(allReqs.map(r => r.id));
        const docCounts = {};
        for (const link of docLinks || []) {
            if ((from || to) && !validReqIds.has(link.request_id)) {
                continue;
            }
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
            PENDING_PAYMENT: 'Pending',
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
                clientName: r.declarant_name || 'Anonymous Declarant',
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
        const totalPending = allReqs.filter(r => !['RELEASED', 'VOID', 'CANCELLED'].includes(r.status)).length;
        const totalPaid = allReqs.filter(r => r.status === 'PAID').length;

        const originalCount = allReqs.filter(r => r.request_type === 'ORIGINAL').length;
        const reprintCount = allReqs.filter(r => r.request_type === 'REPRINT').length;
        const amendedCount = allReqs.filter(r => !!r.amended_from_id).length;

        const STATUS_LABEL_MAP = {
            DRAFT: 'Pending',
            PENDING: 'Pending',
            PENDING_PAYMENT: 'Pending',
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
                actionTaken: r.action_taken || 'PENDING',
                orNumber: r.or_number || 'N/A',
                requestType: r.request_type || 'ORIGINAL',
                amendedFromId: r.amended_from_id || null,
            };
        });

        return {
            totalDocuments,
            totalReleased,
            totalPending,
            totalPaid,
            originalCount,
            reprintCount,
            amendedCount,
            rows,
        };
    }
}

export default new RequestService();