import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { pdf } from '@react-pdf/renderer';
import { requestService } from '../services/requestService';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { landholdingService } from '../services/landholdingService';
import { noLandholdingService } from '../services/noLandholdingService';
import { CertOfNoLandholdingPDF } from './templates/NoLandholdingPDF';
import { CertOfLandholdingPDF } from './templates/LandholdingPDF';
import { TaxDeclarationPDF } from './templates/TaxDeclarationPDF';
// FIX: the backend resolves staffAuthId against staff.auth_user_id, which
// is a Supabase Auth user id — so instead of guessing at a custom
// useAuth()/context shape, we go straight to the Supabase client your
// frontend already has for talking to auth. ADJUST THIS IMPORT PATH to
// wherever your frontend's Supabase client is created (it will NOT be the
// backend's ../../config/supabase.js — that one likely uses a service
// role key and must never ship to the browser). Common locations:
// '../lib/supabaseClient', '../config/supabaseClient', '../supabaseClient'.
import { supabase } from '../../lib/supabaseClient';
import { CustomDateInput } from './CustomDateInput';
import { ADePTSelect } from './ADePTSelect';
import '../styles/InitialDocumentPreviewModal.css';

const EditIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
);
const TrashIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

// Matches the official Declaration of Real Property rounding convention
// (round assessed value to nearest ₱10) — same logic as TaxDeclarationForm.tsx's
// calcAssessedValue, kept in sync here so preview/edit and the main form
// never disagree on totals.
function calcAssessedValue(marketValue: number, assessmentLevel: number): number {
  const raw = (marketValue * assessmentLevel) / 100;
  return Math.round(raw / 10) * 10;
}

interface InitialDocumentPreviewModalProps {
  documentItem: any;
  onClose: () => void;
  onUpdateSuccess: (updatedDoc: any) => void;
  orNumber?: string;
}

export const InitialDocumentPreviewModal: React.FC<InitialDocumentPreviewModalProps> = ({
  documentItem,
  onClose,
  onUpdateSuccess,
  orNumber
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [docType, setDocType] = useState<'NO_LANDHOLDING' | 'LANDHOLDING' | 'TAX_DEC' | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fullData, setFullData] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    declarantName: documentItem.declarantName || documentItem.declarant_name || '',
    requestedByName: documentItem.requestedByName || documentItem.requested_by_name || '',
    propertyLocation: documentItem.propertyLocation || documentItem.property_location || ''
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const filtered = locationOptions.filter(o =>
    o.toLowerCase().includes(formData.propertyLocation.toLowerCase())
  ).slice(0, 8);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const declarantNameEditRef = useRef<HTMLTextAreaElement>(null);
  // Guards the fetch effect against StrictMode's dev-only double invoke, so
  // the document data (and its PDF) is only loaded/generated once per open.
  const fetchStartedRef = useRef(false);

  const resizeDeclarantNameEdit = () => {
    const el = declarantNameEditRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 38)}px`;
  };

  useEffect(() => {
    resizeDeclarantNameEdit();
  }, [formData.declarantName]);

  const getFormattedDates = () => {
    const today = new Date();
    const day = today.getDate().toString();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    const datePaid = today.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    return { day, monthYear, datePaid };
  };

  // Renders the encoded document as a live PDF (same templates the release
  // step prints), so "Initial Document Preview" shows the actual document
  // form instead of a data-field summary.
  const generatePdfPreview = async (data: any, type: 'NO_LANDHOLDING' | 'LANDHOLDING' | 'TAX_DEC') => {
    if (!data) return;
    setIsGeneratingPdf(true);
    try {
      const { day, monthYear, datePaid } = getFormattedDates();
      let PDFComponent;

      if (type === 'NO_LANDHOLDING') {
        PDFComponent = (
          <CertOfNoLandholdingPDF
            ownerName={documentItem.declarantName || documentItem.declarant_name}
            pronoun={data.pronoun}
            property_count={data.propertyCount || data.property_count}
            date_given={data.dateGiven || data.date_given}
            given_at={data.givenAt || data.given_at}
            purpose={data.purpose}
            day={day}
            monthYear={monthYear}
            orNumber={orNumber}
            datePaid={datePaid}
            paperSize={documentItem.paperSize || 'LETTER'}
          />
        );
      } else if (type === 'LANDHOLDING') {
        PDFComponent = (
          <CertOfLandholdingPDF
            ownerName={documentItem.declarantName || documentItem.declarant_name}
            properties={data.properties || []}
            day={day}
            monthYear={monthYear}
            orNumber={orNumber}
            datePaid={datePaid}
            signatoryTopSpacing={data.signatory_top_spacing}
            signatoryGapSpacing={data.signatory_gap_spacing}
            signatoryNameFontSize={data.signatory_name_font_size}
            signatoryTitleFontSize={data.signatory_title_font_size}
            signatoryBlockWidth={data.signatory_block_width}
            signatory1HorizontalOffset={data.signatory_1_offset_x}
            signatory2HorizontalOffset={data.signatory_2_offset_x}
            receiptBottomPosition={data.receipt_bottom_position}
            receiptLeftPosition={data.receipt_left_position}
            receiptRowSpacing={data.receipt_row_spacing}
            tableRowHeight={data.table_row_height}
            tableFontSize={data.table_font_size}
            tableHeaderFontSize={data.table_header_font_size}
            colWidths={data.table_col_widths}
          />
        );
      } else {
        PDFComponent = (
          <TaxDeclarationPDF
            data={data}
            orNumber={orNumber}
            datePaid={datePaid}
          />
        );
      }

      const blob = await pdf(PDFComponent).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error("Failed to generate PDF preview:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Revoke the generated blob URL when the modal unmounts
  useEffect(() => {
    return () => {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  // Fetch the complete form data based on document type AND Metadata for dropdown
  useEffect(() => {
    const fetchFullDetails = async () => {
      setIsLoadingData(true);
      try {
        let barangays: any[] = [];
        let municipalities: any[] = [];
        try {
          const meta = await requestService.getMetadata();
          if (meta?.barangays && meta?.municipalities) {
            barangays = meta.barangays;
            municipalities = meta.municipalities;
            const options = barangays.map((b: any) => {
              const mun = municipalities.find((m: any) => m.id === b.municipality_id);
              return `${b.name}, ${mun ? mun.name : 'Unknown'}`;
            }).sort();
            setLocationOptions(options);
          }
        } catch (metaErr) {
          console.error(metaErr);
        }

        const typeStr = documentItem.documentType?.toLowerCase() || '';
        let determinedType: 'NO_LANDHOLDING' | 'LANDHOLDING' | 'TAX_DEC' = 'TAX_DEC';
        let data = null;

        const fetchOrNull = async (fn: () => Promise<any>) => {
          try {
            return await fn();
          } catch (err: any) {
            if (err?.response?.status === 404) {
              return null;
            }
            throw err;
          }
        };

        if (typeStr.includes('no landholding')) {
          determinedType = 'NO_LANDHOLDING';
          data = await fetchOrNull(() => noLandholdingService.getByRequestId(documentItem.id));
        } else if (typeStr.includes('landholding')) {
          determinedType = 'LANDHOLDING';
          data = await fetchOrNull(() => landholdingService.getByRequestId(documentItem.id));
        } else {
          determinedType = 'TAX_DEC';
          data = await fetchOrNull(() => taxDeclarationService.getTaxDeclaration(documentItem.id));
        }

        setDocType(determinedType);
        setFullData(data);

        if (data) {
          // Fix: Normalize the assessment row data so the table can read and preserve it.
          // Backend returns rows under `assessmentRows` with snake_case fields
          // (market_value, assessment_level, assessed_value, area_unit) —
          // read those as primary, fall back to camelCase for safety.
          if (determinedType === 'TAX_DEC') {
            const rawAssessments = data.assessmentRows || data.assessments || [];
            data.assessments = rawAssessments.map((a: any) => ({
              id: a.id,
              kindOfProperty: a.kind_of_property || a.kindOfProperty || '',
              classificationId: a.classification_id || a.classificationId || '',
              classificationLabel: a.classificationLabel || a.classification_label || (a.classification?.value) || '',
              marketValue: parseFloat(a.market_value ?? a.marketValue ?? 0),
              assessmentLevel: parseFloat(a.assessment_level ?? a.assessmentLevel ?? 0),
              assessedValue: parseFloat(a.assessed_value ?? a.assessedValue ?? 0),
              area: a.area || '',
              areaUnit: a.area_unit || a.areaUnit || '',
            }));
          }

          // The certificate API stores the ownership enum under
          // `ownership_type` (snake_case), while the edit form options use
          // `ownershipType` (camelCase) — same mismatch the assessment rows
          // above had. Normalize on load so the dropdown renders the saved
          // value instead of showing a blank trigger, and drop the snake_case
          // key so a later change can't be shadowed by the stale duplicate.
          if (determinedType === 'LANDHOLDING') {
            data.ownershipType = normalizeOwnershipType(data.ownershipType || data.ownership_type);
            delete data.ownership_type;
          }

          setFullData(data);
          setEditData(JSON.parse(JSON.stringify(data))); // Deep copy for editing
          generatePdfPreview(data, determinedType);
        } else {
          setEditData(determinedType === 'TAX_DEC' ? { assessments: [] } : { properties: [] });
        }
        if (data) {
          const reqByName = data.request?.requested_by_name || data.requestedByName || data.requested_by_name || documentItem.requestedByName || '';
          const rawPropLoc = data.request?.property_location || data.propertyLocation || data.property_location || documentItem.propertyLocation || '';
          const propLoc = resolveLocation(rawPropLoc, barangays, municipalities);

          setFormData(prev => ({
            ...prev,
            requestedByName: reqByName,
            propertyLocation: propLoc
          }));
        }
      } catch (err) {
        console.error("Failed to fetch specific document details:", err);
        setFetchError('Could not load document details — please check the connection.');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    fetchFullDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentItem]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      let finalEditData = { ...editData };

      // Resolved once, used by whichever create branch below needs it.
      const { data: { user: authUser } = { user: null } } = await supabase.auth.getUser();
      const staffAuthId = authUser?.id;

      await requestService.updateRequest(documentItem.id, {
        declarantName: formData.declarantName,
        requestedByName: formData.requestedByName,
        propertyLocation: docType === 'NO_LANDHOLDING' ? undefined : formData.propertyLocation
      });

      // Compute totals up front so a FIRST-TIME save also persists correct
      // totals, not just subsequent edits.
      if (docType === 'TAX_DEC' && finalEditData.assessments) {
        let totalMV = 0;
        let totalAV = 0;
        finalEditData.assessments = finalEditData.assessments.map((a: any) => {
          const mv = parseFloat(a.marketValue ?? a.market_value) || 0;
          const lvl = parseFloat(a.assessmentLevel ?? a.assessment_level) || 0;
          const av = calcAssessedValue(mv, lvl);
          totalMV += mv;
          totalAV += av;
          // Persist the rounded per-row assessed value too, so it stays
          // consistent with what TaxDeclarationForm.tsx would have saved.
          return { ...a, marketValue: mv, assessmentLevel: lvl, assessedValue: av };
        });
        finalEditData.totalMarketValue = totalMV;
        finalEditData.totalAssessedValue = totalAV;
      }

      // FIX: this used to be `if (docId) { ...TAX_DEC only... } else if
      // (docType === 'LANDHOLDING') {...} else if (docType === 'NO_LANDHOLDING')
      // {...}` — so any Landholding/No-Landholding certificate that ALREADY
      // had an encoded record (i.e. docId is set) fell into the first
      // branch, skipped the TAX_DEC inner check, and its edits (added
      // property rows, ownership type, etc.) were silently NEVER persisted.
      // Now each document type handles both create (no id yet) and update
      // (existing id) itself.
      const docId = finalEditData.id;
      if (docType === 'TAX_DEC') {
        if (!staffAuthId) {
          throw new Error('Could not determine the current staff user — please re-login and try again.');
        }
        const saved = await taxDeclarationService.save(
          {
            ...finalEditData,
            assessmentRows: finalEditData.assessments || [],
          } as any,
          documentItem.id,
          staffAuthId
        );
        finalEditData = { ...finalEditData, ...(saved?.data ?? saved) };
      }
      else if (docType === 'LANDHOLDING') {
        const properties = (finalEditData.properties || []).map((p: any) => {
          const raw = String(p.area || '').trim();
          if (!raw) return { ...p, area: '' };
          return { ...p, area: stripAreaUnit(raw) === raw ? `${raw} ${detectAreaUnit(raw)}` : p.area };
        });
        const payload = {
          ...finalEditData,
          properties,
          declarantName: formData.declarantName,
          declarant_name: formData.declarantName
        };
        if (docId) {
          const updated = await landholdingService.updateDraft(docId, payload);
          finalEditData = { ...finalEditData, ...updated };
        } else {
          if (!staffAuthId) {
            throw new Error('Could not determine the current staff user — please re-login and try again.');
          }
          const saved = await landholdingService.saveCertificate(
            { ...payload, requestId: documentItem.id },
            staffAuthId
          );
          finalEditData = { ...finalEditData, ...(saved?.data ?? saved) };
        }
      }
      else if (docType === 'NO_LANDHOLDING') {
        const payload = {
          ...finalEditData,
          declarantName: formData.declarantName,
          declarant_name: formData.declarantName
        };
        if (docId) {
          const updated = await noLandholdingService.updateDraft(docId, payload);
          finalEditData = { ...finalEditData, ...updated };
        } else {
          if (!staffAuthId) {
            throw new Error('Could not determine the current staff user — please re-login and try again.');
          }
          const saved = await noLandholdingService.saveCertificate(
            { ...payload, requestId: documentItem.id },
            staffAuthId
          );
          finalEditData = { ...finalEditData, ...(saved?.data ?? saved) };
        }
      }

      // Recompute the printed "Area: X has./sqm." line from the edited
      // assessment rows (same logic as taxDeclarationService's
      // getTaxDeclaration) so the regenerated preview reflects unit
      // changes instead of keeping the stale string loaded at open.
      if (docType === 'TAX_DEC' && finalEditData.assessments) {
        const rows = finalEditData.assessments;
        const total = rows.reduce(
          (sum: number, r: any) => sum + (parseFloat(String(r.area || '').replace(/,/g, '')) || 0),
          0
        );
        const unit = rows.map((r: any) => (r.areaUnit || '').trim()).filter(Boolean)[0] || '';
        const suffix = /sq/i.test(unit) ? 'sqm.' : unit ? 'has.' : '';
        const formatted = total > 0
          ? total.toLocaleString(undefined, {
              minimumFractionDigits: /sq/i.test(unit) ? 2 : 0,
              maximumFractionDigits: 10,
            })
          : '';
        finalEditData.area = formatted ? `${formatted}${suffix ? ' ' + suffix : ''}` : '';
      }

      setFullData(finalEditData);
      if (docType) generatePdfPreview(finalEditData, docType);

      onUpdateSuccess({
        ...documentItem,
        declarantName: formData.declarantName,
        declarant_name: formData.declarantName,
        requestedByName: formData.requestedByName,
        requested_by_name: formData.requestedByName,
        propertyLocation: formData.propertyLocation,
        property_location: formData.propertyLocation
      });

      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update details in database.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '0.00' : num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- ARRAY UPDATERS FOR EDIT MODE ---
  const updateProperty = (index: number, field: string, value: any) => {
    const newProps = [...(editData?.properties || [])];
    newProps[index] = { ...newProps[index], [field]: value };
    if (field === 'tdArpNumber') delete newProps[index].td_arp_number;
    if (field === 'locationOfProperty') delete newProps[index].location_of_property;
    if (field === 'lotNumber') delete newProps[index].lot_number;
    if (field === 'titleNumber') delete newProps[index].title_number;
    if (field === 'assessedValue') delete newProps[index].assessed_value;
    setEditData({ ...editData, properties: newProps });
  };

  const updateAssessment = (index: number, field: string, value: any) => {
    const newAss = [...(editData?.assessments || [])];
    newAss[index] = { ...newAss[index], [field]: value };
    if (field === 'kindOfProperty') delete newAss[index].kind_of_property;
    if (field === 'classificationLabel') delete newAss[index].classification_label;
    if (field === 'marketValue') delete newAss[index].market_value;
    if (field === 'assessmentLevel') delete newAss[index].assessment_level;
    if (field === 'areaUnit') delete newAss[index].area_unit;
    setEditData({ ...editData, assessments: newAss });
  };

  // --- ADD ROW FUNCTIONS ---
  const addAssessmentRow = () => {
    const newAssessments = [...(editData?.assessments || [])];
    newAssessments.push({
      kindOfProperty: '',
      classificationLabel: '',
      marketValue: 0,
      assessmentLevel: 0,
      area: '',
      areaUnit: 'HECTARE',
    });
    setEditData({ ...editData, assessments: newAssessments });
  };

  const addPropertyRow = () => {
    const newProps = [...(editData?.properties || [])];
    newProps.push({
      tdArpNumber: '',
      locationOfProperty: '',
      lotNumber: '',
      titleNumber: '',
      area: '',
      assessedValue: 0,
    });
    setEditData({ ...editData, properties: newProps });
  };

  // --- REMOVE ROW FUNCTIONS ---
  const removeAssessmentRow = (index: number) => {
    const newAssessments = [...(editData?.assessments || [])];
    newAssessments.splice(index, 1);
    setEditData({ ...editData, assessments: newAssessments });
  };

  const removePropertyRow = (index: number) => {
    const newProps = [...(editData?.properties || [])];
    newProps.splice(index, 1);
    setEditData({ ...editData, properties: newProps });
  };

  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v);

  const resolveLocation = (raw: string, barangays: any[], municipalities: any[]) => {
    if (!raw || !isUuid(raw)) return raw;
    const b = barangays.find((x: any) => x.id === raw);
    if (!b) return raw;
    const m = municipalities.find((x: any) => x.id === b.municipality_id);
    return `${b.name}, ${m ? m.name : 'Unknown'}`;
  };

  // The certificate API stores the ownership enum under `ownership_type`
  // (snake_case) with values like 'single' | 'multiple', while the edit
  // options use the same lowercase ids. Older/mock records may carry
  // casing or spacing variants ('Single owner', etc.), so fold everything
  // down to the canonical option ids instead of leaving the dropdown blank.
  const normalizeOwnershipType = (val?: string | null) => {
    const s = String(val || '').toLowerCase().trim();
    if (s.includes('multiple') || s.includes('co-owner') || s.includes('co owner')) return 'multiple';
    if (s.includes('single')) return 'single';
    return s;
  };

  // --- RENDERING SPECIFIC EDITORS ---
  const renderNoLandholdingEdit = () => (
    <div className="idpm-grid idpm-grid-2">
      <div className="idpm-field">
        <label className="idpm-label">Pronoun</label>
        <ADePTSelect
          variant="block"
          value={editData?.pronoun || ''}
          onChange={(v) => setEditData({ ...editData, pronoun: v })}
          options={[
            { value: 'His', label: 'His' },
            { value: 'Her', label: 'Her' },
            { value: 'Their', label: 'Their' },
          ]}
        />
      </div>
      <div className="idpm-field">
        <label className="idpm-label">Property Count</label>
        <ADePTSelect
          variant="block"
          value={editData?.propertyCount || ''}
          onChange={(v) => setEditData({ ...editData, propertyCount: v })}
          options={[
            { value: 'singular', label: 'Singular (Property/Name)' },
            { value: 'plural', label: 'Plural (Properties/Names)' },
          ]}
        />
      </div>
      <div className="idpm-field">
        <label className="idpm-label">Date Given</label>
        <CustomDateInput
          value={editData?.dateGiven || editData?.date_given || ''}
          onChange={(v) => setEditData({ ...editData, dateGiven: v })}
          className="idpm-input"
        />
      </div>
      <div className="idpm-field">
        <label className="idpm-label">Given At</label>
        <input type="text" value={editData?.givenAt || editData?.given_at || ''} onChange={(e) => setEditData({ ...editData, givenAt: e.target.value })} className="idpm-input" />
      </div>
      <div className="idpm-field" style={{ gridColumn: '1 / -1' }}>
        <label className="idpm-label">Purpose / Intent</label>
        <input type="text" value={editData?.purpose || ''} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} className="idpm-input" />
      </div>
    </div>
  );

  const stripAreaUnit = (raw: string) =>
    String(raw || '')
      .replace(/(hectares?|has\.?|sq\.?\s*m\.?|sqm\.?|square\s*meters?)$/i, '')
      .trim();
  const detectAreaUnit = (raw: string) => (/sq/i.test(String(raw || '')) ? 'sqm.' : 'has.');

  const renderLandholdingEdit = () => (
    <div className="idpm-form">
      <div className="idpm-grid idpm-grid-2">
        <div className="idpm-field">
          <label className="idpm-label">Ownership Type</label>
          <ADePTSelect
            variant="block"
            value={editData?.ownershipType || ''}
            onChange={(v) => setEditData({ ...editData, ownershipType: v })}
            options={[
              { value: 'single', label: 'Single Owner' },
              { value: 'multiple', label: 'Multiple Owners' },
            ]}
          />
        </div>
        <div className="idpm-field">
          <label className="idpm-label">Date Given</label>
          <CustomDateInput
            value={editData?.dateGiven || editData?.date_given || ''}
            onChange={(v) => setEditData({ ...editData, dateGiven: v })}
            className="idpm-input"
          />
        </div>
        <div className="idpm-field">
          <label className="idpm-label">Given At</label>
          <input type="text" value={editData?.givenAt || editData?.given_at || ''} onChange={(e) => setEditData({ ...editData, givenAt: e.target.value })} className="idpm-input" />
        </div>
        <div className="idpm-field">
          <label className="idpm-label">Purpose / Intent</label>
          <input type="text" value={editData?.purpose || ''} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} className="idpm-input" />
        </div>
      </div>

      {/* DECLARED PROPERTIES */}
      <div className="idpm-panel">
        <div className="idpm-section-head">
          <span className="idpm-section-title">Declared Properties</span>
          <button onClick={addPropertyRow} className="idpm-add-row-btn">
            <PlusIcon size={14} /> Add Row
          </button>
        </div>

        {(editData?.properties || []).length === 0 ? (
          <div className="idpm-empty-box">No properties added.</div>
        ) : (
          <div className="idpm-form" style={{ gap: '10px' }}>
            {(editData?.properties || []).map((p: any, i: number) => (
              <React.Fragment key={i}>
                <div className="idpm-row-card">
                  <div className="idpm-prop-grid">
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">TD/ARP No.</label>
                      <input
                        type="text"
                        value={p.tdArpNumber || p.td_arp_number || ''}
                        onChange={(e) => updateProperty(i, 'tdArpNumber', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Location</label>
                      <input
                        type="text"
                        value={p.locationOfProperty || p.location_of_property || ''}
                        onChange={(e) => updateProperty(i, 'locationOfProperty', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Lot No.</label>
                      <input
                        type="text"
                        value={p.lotNumber || p.lot_number || ''}
                        onChange={(e) => updateProperty(i, 'lotNumber', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Title No.</label>
                      <input
                        type="text"
                        value={p.titleNumber || p.title_number || ''}
                        onChange={(e) => updateProperty(i, 'titleNumber', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                  </div>
                  <div className="idpm-area-grid">
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Area</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={p.area || ''}
                          onChange={(e) => updateProperty(i, 'area', e.target.value)}
                          className="idpm-input"
                        />
                        <ADePTSelect
                          variant="sm"
                          value={detectAreaUnit(p.area || '')}
                          onChange={(v) => {
                            const bare = stripAreaUnit(p.area || '');
                            updateProperty(i, 'area', bare ? `${bare} ${v}` : v);
                          }}
                          options={[
                            { value: 'has.', label: 'has.' },
                            { value: 'sqm.', label: 'sqm.' },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Assessed Value (₱)</label>
                      <input
                        type="number"
                        value={p.assessedValue || p.assessed_value || 0}
                        onChange={(e) => updateProperty(i, 'assessedValue', e.target.value)}
                        className="idpm-input idpm-input--num"
                      />
                    </div>
                  </div>
                </div>
                <div className="idpm-row-actions">
                  <button onClick={() => removePropertyRow(i)} className="idpm-remove-row-btn" title="Remove this property row">
                    <TrashIcon size={13} /> Remove Row
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTaxDecEdit = () => (
    <div className="idpm-form">
      <div className="idpm-basebox">
        <div className="idpm-grid idpm-grid-2">
          <div className="idpm-field"><label className="idpm-label">ARP No.</label><input type="text" value={editData?.taxDeclarationNumber || editData?.tax_declaration_number || ''} onChange={(e) => setEditData({ ...editData, taxDeclarationNumber: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label">PIN</label><input type="text" value={editData?.propertyIndexNumber || editData?.property_index_number || ''} onChange={(e) => setEditData({ ...editData, propertyIndexNumber: e.target.value })} className="idpm-input" /></div>
        </div>
      </div>

      <div className="idpm-basebox">
        <div className="idpm-grid idpm-grid-2">
          <div className="idpm-field"><label className="idpm-label">Owner Name</label><input type="text" value={editData?.ownerName || editData?.owner_name || ''} onChange={(e) => setEditData({ ...editData, ownerName: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label">Owner Address</label><input type="text" value={editData?.ownerAddress || editData?.owner_address || ''} onChange={(e) => setEditData({ ...editData, ownerAddress: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label">Administrator Name</label><input type="text" value={editData?.administratorName || editData?.administrator_name || ''} onChange={(e) => setEditData({ ...editData, administratorName: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label">Administrator Address</label><input type="text" value={editData?.administratorAddress || editData?.administrator_address || ''} onChange={(e) => setEditData({ ...editData, administratorAddress: e.target.value })} className="idpm-input" /></div>
        </div>
      </div>

      <div className="idpm-basebox">
        <label className="idpm-label" style={{ marginBottom: '10px', display: 'block' }}>Boundaries</label>
        <div className="idpm-grid idpm-grid-2">
          <div className="idpm-field"><label className="idpm-label idpm-label--thin">NORTH</label><input type="text" value={editData?.boundaryNorth || editData?.boundary_north || ''} onChange={(e) => setEditData({ ...editData, boundaryNorth: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label idpm-label--thin">SOUTH</label><input type="text" value={editData?.boundarySouth || editData?.boundary_south || ''} onChange={(e) => setEditData({ ...editData, boundarySouth: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label idpm-label--thin">EAST</label><input type="text" value={editData?.boundaryEast || editData?.boundary_east || ''} onChange={(e) => setEditData({ ...editData, boundaryEast: e.target.value })} className="idpm-input" /></div>
          <div className="idpm-field"><label className="idpm-label idpm-label--thin">WEST</label><input type="text" value={editData?.boundaryWest || editData?.boundary_west || ''} onChange={(e) => setEditData({ ...editData, boundaryWest: e.target.value })} className="idpm-input" /></div>
        </div>
      </div>

      {/* KIND OF PROPERTY & VALUATION */}
      <div className="idpm-panel">
        <div className="idpm-section-head">
          <span className="idpm-section-title">Kind of Property &amp; Valuation</span>
          <button onClick={addAssessmentRow} className="idpm-add-row-btn">
            <PlusIcon size={14} /> Add Row
          </button>
        </div>
        {(editData?.assessments || []).length === 0 ? (
          <div className="idpm-empty-box">No assessments added.</div>
        ) : (
          <div className="idpm-form" style={{ gap: '10px' }}>
            {(editData?.assessments || []).map((a: any, i: number) => {
              const mv = parseFloat(a.marketValue || a.market_value) || 0;
              const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
              const computed = calcAssessedValue(mv, lvl);
              const av = computed > 0 ? computed : (parseFloat(a.assessedValue) || 0);
              return (
                <div key={i} className="idpm-row-card">
                  <div className="idpm-row-head">
                    <span className="idpm-row-label">Assessment #{i + 1}</span>
                    <button
                      onClick={() => removeAssessmentRow(i)}
                      title="Remove assessment"
                      className="idpm-row-remove-btn"
                    >
                      ×
                    </button>
                  </div>
                  <div className="idpm-grid idpm-grid-3">
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Kind of Property</label>
                      <input
                        type="text"
                        value={a.kindOfProperty || a.kind_of_property || ''}
                        onChange={(e) => updateAssessment(i, 'kindOfProperty', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Classification</label>
                      <input
                        type="text"
                        value={a.classificationLabel || a.classification_label || ''}
                        onChange={(e) => updateAssessment(i, 'classificationLabel', e.target.value)}
                        className="idpm-input"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Area</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={a.area || ''}
                          onChange={(e) => updateAssessment(i, 'area', e.target.value)}
                          className="idpm-input"
                        />
                        <ADePTSelect
                          variant="sm"
                          value={/sq/i.test(a.areaUnit || '') ? 'SQM' : 'HECTARE'}
                          onChange={(v) => updateAssessment(i, 'areaUnit', v)}
                          options={[
                            { value: 'HECTARE', label: 'has.' },
                            { value: 'SQM', label: 'sqm.' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="idpm-grid idpm-grid-3" style={{ marginTop: '10px' }}>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Market Value (₱)</label>
                      <input
                        type="number"
                        value={mv}
                        onChange={(e) => updateAssessment(i, 'marketValue', e.target.value)}
                        className="idpm-input idpm-input--num"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Assess. Level (%)</label>
                      <input
                        type="number"
                        value={lvl}
                        onChange={(e) => updateAssessment(i, 'assessmentLevel', e.target.value)}
                        className="idpm-input idpm-input--num"
                      />
                    </div>
                    <div className="idpm-field">
                      <label className="idpm-label idpm-label--thin">Assessed Value (₱)</label>
                      <div className="idpm-read">₱ {formatCurrency(av)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TOTALS */}
        <div className="idpm-totals">
          <span className="idpm-totals-label">TOTALS</span>
          <span className="idpm-totals-value">
            Market Value: <strong>₱ {formatCurrency(editData?.assessments?.reduce((sum: number, a: any) => sum + (parseFloat(a.marketValue || a.market_value) || 0), 0) || 0)}</strong>
          </span>
          <span className="idpm-totals-value">
            Assessed Value: <strong>₱ {formatCurrency(editData?.assessments?.reduce((sum: number, a: any) => {
              const mv = parseFloat(a.marketValue || a.market_value) || 0;
              const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
              const computed = calcAssessedValue(mv, lvl);
              return sum + (computed > 0 ? computed : (parseFloat(a.assessedValue || a.assessed_value) || 0));
            }, 0) || 0)}</strong>
          </span>
        </div>
      </div>

      <div className="idpm-grid idpm-grid-2">
        <div className="idpm-field">
          <label className="idpm-label">Taxability</label>
          <ADePTSelect
            variant="block"
            value={editData?.taxability || 'TAXABLE'}
            onChange={(v) => setEditData({ ...editData, taxability: v })}
            options={[
              { value: 'TAXABLE', label: 'TAXABLE' },
              { value: 'EXEMPT', label: 'EXEMPT' },
            ]}
          />
        </div>
        <div className="idpm-field">
          <label className="idpm-label">Effectivity Year</label>
          <input type="number" value={editData?.effectivityYear || editData?.effectivity_year || ''} onChange={(e) => setEditData({ ...editData, effectivityYear: e.target.value })} className="idpm-input" />
        </div>
      </div>
    </div>
  );

  // Full Document Edit form — rendered beside the document preview so staff
  // can edit without switching modes, and also used for the full-screen
  // edit mode.
  const renderEditForm = () => (
    <div className="idpm-form">
      <div className="idpm-note-edit">
        <strong>Editing Mode:</strong> Update any field below to correct typos or incorrect data.
      </div>

      {/* Base Fields */}
      <div className={`idpm-basebox idpm-grid ${docType === 'NO_LANDHOLDING' ? 'idpm-grid-2' : 'idpm-grid-2h'}`}>
        <div className="idpm-field">
          <label className="idpm-label">Declarant / Owner Name</label>
          <textarea
            ref={declarantNameEditRef}
            rows={1}
            value={formData.declarantName}
            onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })}
            className="idpm-input"
          />
        </div>
        <div className="idpm-field">
          <label className="idpm-label">Requested By Name</label>
          <input type="text" value={formData.requestedByName} onChange={(e) => setFormData({ ...formData, requestedByName: e.target.value })} className="idpm-input" />
        </div>
        {docType !== 'NO_LANDHOLDING' && (
          <div className="idpm-field" style={{ position: 'relative' }}>
            <label className="idpm-label">Property Location</label>
            <input
              type="text"
              value={formData.propertyLocation}
              onChange={(e) => { setFormData({ ...formData, propertyLocation: e.target.value }); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Select or type..."
              className="idpm-input"
            />
            {showSuggestions && filtered.length > 0 && (
              <div className="idpm-suggest">
                {filtered.map((loc, i) => (
<div key={i}
                    className="idpm-suggest-item"
                    onMouseDown={() => { setFormData({ ...formData, propertyLocation: loc }); setShowSuggestions(false); }}
                    onMouseEnter={(e) => e.currentTarget.classList.add('hover')}
                    onMouseLeave={(e) => e.currentTarget.classList.remove('hover')}
                  >{loc}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <hr className="idpm-divider" />

      {docType === 'NO_LANDHOLDING' && renderNoLandholdingEdit()}
      {docType === 'LANDHOLDING' && renderLandholdingEdit()}
      {docType === 'TAX_DEC' && renderTaxDecEdit()}
    </div>
  );

  const modalContent = (
    <div className="idpm-overlay">
      <div className="idpm-modal">

        {/* Header */}
        <div className="idpm-header">
          <h3>
            {isEditing ? <><EditIcon size={17} /> Full Document Edit</> : <><SearchIcon size={17} /> Initial Document Preview</>}
          </h3>
          <button onClick={onClose} className="idpm-header-close" title="Close">&times;</button>
        </div>

        {/* Body */}
        <div className="idpm-body">
          {error && <div className="idpm-error">{error}</div>}

          <div className="idpm-refbar">
            <div>
              <span className="idpm-refbar-label">Reference Number</span>
              <div className="idpm-refbar-value">{documentItem.referenceNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="idpm-refbar-label">Document Type</span>
              <div className="idpm-refbar-value idpm-refbar-value--acc">{documentItem.documentType}</div>
            </div>
          </div>

          {!isEditing ? (
            isLoadingData || isGeneratingPdf ? (
              <div className="idpm-hint-loading">
                Loading PDF preview...
              </div>
            ) : (
              <div className="idpm-view">
                  <div className="idpm-pane-pdf">
                      {fetchError && (
                        <div className="idpm-hint-error">
                          {fetchError}
                        </div>
                      )}
                      {!fetchError && !fullData && (
                        <div className="idpm-hint-warn">
                          This document hasn't been encoded yet. Fill in the form beside the preview to encode it.
                        </div>
                      )}
                      {!fetchError && fullData && (
                        pdfUrl ? (
                          <iframe
                            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            title="Document PDF Preview"
                            className="idpm-pdf-frame"
                          />
                        ) : (
                          <div className="idpm-hint-error">
                            Could not generate the PDF preview. Please try editing the document, or check the console for details.
                          </div>
                        )
                      )}
                  </div>
                  <div className="idpm-pane-form">
                    {renderEditForm()}
                  </div>
                </div>
            )
          ) : (
            renderEditForm()
          )}
        </div>

        {/* Footer Actions */}
        <div className="idpm-footer">
          {!isEditing ? (
            <>
              <button onClick={handleSave} disabled={isSaving} className="idpm-btn idpm-btn-save">
                <EditIcon size={15} /> {isSaving ? 'Saving to DB...' : 'Save & Update DB'}
              </button>
              <button onClick={onClose} className="idpm-btn idpm-btn-close">
                Close
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="idpm-btn idpm-btn-close">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="idpm-btn idpm-btn-save">
                {isSaving ? 'Saving to DB...' : 'Save & Update DB'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};