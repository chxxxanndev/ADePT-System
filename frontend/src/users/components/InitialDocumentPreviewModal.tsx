import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { requestService } from '../services/requestService';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { landholdingService } from '../services/landholdingService';
import { noLandholdingService } from '../services/noLandholdingService';

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

interface InitialDocumentPreviewModalProps {
  documentItem: any;
  onClose: () => void;
  onUpdateSuccess: (updatedDoc: any) => void;
}

export const InitialDocumentPreviewModal: React.FC<InitialDocumentPreviewModalProps> = ({
  documentItem,
  onClose,
  onUpdateSuccess
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [docType, setDocType] = useState<'NO_LANDHOLDING' | 'LANDHOLDING' | 'TAX_DEC' | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fullData, setFullData] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});

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

  const resizeDeclarantNameEdit = () => {
    const el = declarantNameEditRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (isEditing) resizeDeclarantNameEdit();
  }, [isEditing, formData.declarantName]);

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

        if (data) {
        // Fix: Normalize the assessment row data so the table can read and preserve it
        if (determinedType === 'TAX_DEC' && data.assessments) {
            data.assessments = data.assessments.map((a: any) => ({
            id: a.id,
            kindOfProperty: a.kindOfProperty || a.kind_of_property || '',
            classificationId: a.classificationId || a.classification_id || '',
            classificationLabel: a.classificationLabel || a.classification_label || (a.classification?.value) || '',
            marketValue: parseFloat(a.marketValue || a.market_value || 0),
            assessmentLevel: parseFloat(a.assessmentLevel || a.assessment_level || 0),
            assessedValue: parseFloat(a.assessedValue || a.assessed_value || 0),
            area: a.area || '',
            areaUnit: a.areaUnit || a.area_unit || '',
            }));
        }
    
        setFullData(data);
        setEditData(JSON.parse(JSON.stringify(data))); // Deep copy for editing
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

    fetchFullDetails();
  }, [documentItem]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      let finalEditData = { ...editData };

      await requestService.updateRequest(documentItem.id, {
        declarantName: formData.declarantName,
        requestedByName: formData.requestedByName,
        propertyLocation: docType === 'NO_LANDHOLDING' ? undefined : formData.propertyLocation
      });

      const docId = finalEditData.id;
      if (docId) {
        if (docType === 'TAX_DEC') {
          if (finalEditData.assessments) {
            let totalMV = 0;
            let totalAV = 0;
            finalEditData.assessments.forEach((a: any) => {
              const mv = parseFloat(a.marketValue || a.market_value) || 0;
              const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
              totalMV += mv;
              totalAV += (mv * lvl) / 100;
            });
            finalEditData.totalMarketValue = totalMV;
            finalEditData.totalAssessedValue = totalAV;
          }
          await taxDeclarationService.updateDraft(docId, finalEditData);
        }
        else if (docType === 'LANDHOLDING') {
          await landholdingService.updateDraft(docId, {
            ...finalEditData,
            declarantName: formData.declarantName,
            declarant_name: formData.declarantName
          });
        }
        else if (docType === 'NO_LANDHOLDING') {
          await noLandholdingService.updateDraft(docId, {
            ...finalEditData,
            declarantName: formData.declarantName,
            declarant_name: formData.declarantName
          });
        }
      }

      setFullData(finalEditData);

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

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // --- ARRAY UPDATERS FOR EDIT MODE ---
  const updateProperty = (index: number, field: string, value: any) => {
    const newProps = [...(editData?.properties || [])];
    newProps[index] = { ...newProps[index], [field]: value };
    // Remove old camelCase keys if they exist (to keep consistency)
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

  // --- RENDERING SPECIFIC PREVIEWS ---
  const renderNoLandholdingPreview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
        <div><span style={labelStyle}>Pronoun</span><div style={valueStyle}>{fullData?.pronoun || 'N/A'}</div></div>
        <div><span style={labelStyle}>Property Count</span><div style={valueStyle}>{fullData?.propertyCount === 'plural' ? 'Plural (Properties/Names)' : 'Singular (Property/Name)'}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div><span style={labelStyle}>Date Given</span><div style={valueStyle}>{formatDate(fullData?.dateGiven || fullData?.date_given)}</div></div>
        <div><span style={labelStyle}>Given At</span><div style={valueStyle}>{fullData?.givenAt || fullData?.given_at || 'N/A'}</div></div>
      </div>
      <div><span style={labelStyle}>Purpose / Intent</span><div style={valueStyle}>{fullData?.purpose || 'N/A'}</div></div>
    </div>
  );

  const renderLandholdingPreview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
        <div><span style={labelStyle}>Ownership Type</span><div style={valueStyle}>{fullData?.ownershipType === 'multiple' ? 'Multiple Owners' : 'Single Owner'}</div></div>
        <div><span style={labelStyle}>Given At</span><div style={valueStyle}>{fullData?.givenAt || fullData?.given_at || 'N/A'}</div></div>
      </div>
      <div><span style={labelStyle}>Purpose / Intent</span><div style={valueStyle}>{fullData?.purpose || 'N/A'}</div></div>

      <div>
        <span style={labelStyle}>Declared Properties ({(fullData?.properties || []).length})</span>
        <div style={{ overflowX: 'auto', marginTop: '8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={thStyle}>TD/ARP No.</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Lot No.</th>
                <th style={thStyle}>Title No.</th>
                <th style={thStyle}>Area</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Assessed Val.</th>
              </tr>
            </thead>
            <tbody>
              {(fullData?.properties || []).length === 0 && <tr><td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>No properties recorded.</td></tr>}
              {(fullData?.properties || []).map((p: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>{p.td_arp_number || p.tdArpNumber}</td>
                  <td style={tdStyle}>{p.location_of_property || p.locationOfProperty}</td>
                  <td style={tdStyle}>{p.lot_number || p.lotNumber}</td>
                  <td style={tdStyle}>{p.title_number || p.titleNumber}</td>
                  <td style={tdStyle}>{p.area}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>₱ {formatCurrency(p.assessed_value || p.assessedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTaxDecPreview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <div><span style={labelStyle}>ARP No.</span><div style={{ ...valueStyle, color: '#166534', fontWeight: 700 }}>{fullData?.taxDeclarationNumber || fullData?.tax_declaration_number || 'N/A'}</div></div>
        <div><span style={labelStyle}>PIN</span><div style={{ ...valueStyle, color: '#166534', fontWeight: 700 }}>{fullData?.propertyIndexNumber || fullData?.property_index_number || 'N/A'}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div><span style={labelStyle}>Owner Name</span><div style={valueStyle}>{fullData?.ownerName || fullData?.owner_name || 'N/A'}</div></div>
        <div><span style={labelStyle}>Owner Address</span><div style={valueStyle}>{fullData?.ownerAddress || fullData?.owner_address || 'N/A'}</div></div>
        <div><span style={labelStyle}>Administrator</span><div style={valueStyle}>{fullData?.administratorName || fullData?.administrator_name || 'N/A'}</div></div>
        <div><span style={labelStyle}>Admin Address</span><div style={valueStyle}>{fullData?.administratorAddress || fullData?.administrator_address || 'N/A'}</div></div>
      </div>

      <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
        <span style={{ ...labelStyle, marginBottom: '12px', display: 'block' }}>Boundaries</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><span style={{ fontSize: '11px', color: '#9ca3af' }}>NORTH:</span> <span style={{ fontSize: '13px' }}>{fullData?.boundaryNorth || fullData?.boundary_north || '-'}</span></div>
          <div><span style={{ fontSize: '11px', color: '#9ca3af' }}>SOUTH:</span> <span style={{ fontSize: '13px' }}>{fullData?.boundarySouth || fullData?.boundary_south || '-'}</span></div>
          <div><span style={{ fontSize: '11px', color: '#9ca3af' }}>EAST:</span> <span style={{ fontSize: '13px' }}>{fullData?.boundaryEast || fullData?.boundary_east || '-'}</span></div>
          <div><span style={{ fontSize: '11px', color: '#9ca3af' }}>WEST:</span> <span style={{ fontSize: '13px' }}>{fullData?.boundaryWest || fullData?.boundary_west || '-'}</span></div>
        </div>
      </div>

      <div>
        <span style={labelStyle}>Assessments ({(fullData?.assessments || []).length})</span>
        <div style={{ overflowX: 'auto', marginTop: '8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={thStyle}>Kind of Property</th>
                <th style={thStyle}>Classification</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Market Val.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Level</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Assessed Val.</th>
                <th style={thStyle}>Area</th>
              </tr>
            </thead>
            <tbody>
              {(fullData?.assessments || []).length === 0 && <tr><td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>No assessments recorded.</td></tr>}
              {(fullData?.assessments || []).map((a: any, i: number) => {
                const mv = parseFloat(a.marketValue || a.market_value) || 0;
                const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
                const av = (mv * lvl) / 100;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>{a.kindOfProperty || '-'}</td>
                    <td style={tdStyle}>{a.classificationLabel || (a.classification?.value) || '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>₱ {formatCurrency(mv)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{lvl}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>₱ {formatCurrency(av)}</td>
                    <td style={tdStyle}>{a.area || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ backgroundColor: '#f9fafb', fontWeight: 700, borderTop: '2px solid #d1d5db' }}>
              <tr>
                <td colSpan={2} style={tdStyle}>TOTALS</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>₱ {formatCurrency(fullData?.totalMarketValue || fullData?.total_market_value || 0)}</td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#166534' }}>₱ {formatCurrency(fullData?.totalAssessedValue || fullData?.total_assessed_value || 0)}</td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  // --- RENDERING SPECIFIC EDITORS ---
  const renderNoLandholdingEdit = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <label style={editLabelStyle}>Pronoun</label>
        <select value={editData?.pronoun || ''} onChange={(e) => setEditData({ ...editData, pronoun: e.target.value })} style={inputStyle}>
          <option value="His">His</option>
          <option value="Her">Her</option>
          <option value="Their">Their</option>
        </select>
      </div>
      <div>
        <label style={editLabelStyle}>Property Count</label>
        <select value={editData?.propertyCount || ''} onChange={(e) => setEditData({ ...editData, propertyCount: e.target.value })} style={inputStyle}>
          <option value="singular">Singular (Property/Name)</option>
          <option value="plural">Plural (Properties/Names)</option>
        </select>
      </div>
      <div>
        <label style={editLabelStyle}>Date Given</label>
        <input type="date" value={editData?.dateGiven || editData?.date_given || ''} onChange={(e) => setEditData({ ...editData, dateGiven: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={editLabelStyle}>Given At</label>
        <input type="text" value={editData?.givenAt || editData?.given_at || ''} onChange={(e) => setEditData({ ...editData, givenAt: e.target.value })} style={inputStyle} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={editLabelStyle}>Purpose / Intent</label>
        <input type="text" value={editData?.purpose || ''} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} style={inputStyle} />
      </div>
    </div>
  );

  const renderLandholdingEdit = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={editLabelStyle}>Ownership Type</label>
          <select value={editData?.ownershipType || ''} onChange={(e) => setEditData({ ...editData, ownershipType: e.target.value })} style={inputStyle}>
            <option value="single">Single Owner</option>
            <option value="multiple">Multiple Owners</option>
          </select>
        </div>
        <div>
          <label style={editLabelStyle}>Date Given</label>
          <input type="date" value={editData?.dateGiven || editData?.date_given || ''} onChange={(e) => setEditData({ ...editData, dateGiven: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={editLabelStyle}>Given At</label>
          <input type="text" value={editData?.givenAt || editData?.given_at || ''} onChange={(e) => setEditData({ ...editData, givenAt: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={editLabelStyle}>Purpose / Intent</label>
          <input type="text" value={editData?.purpose || ''} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} style={inputStyle} />
        </div>
      </div>

      {/* DECLARED PROPERTIES TABLE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>DECLARED PROPERTIES</span>
          <button
            onClick={addPropertyRow}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={14} /> Add Row
          </button>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={thStyle}>TD/ARP No.</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Lot No.</th>
                <th style={thStyle}>Title No.</th>
                <th style={thStyle}>Area</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Assessed Val.</th>
                <th style={{ ...thStyle, textAlign: 'center' }}> </th>
              </tr>
            </thead>
            <tbody>
              {(editData?.properties || []).length === 0 && (
                <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>No properties added.</td></tr>
              )}
              {(editData?.properties || []).map((p: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={p.tdArpNumber || p.td_arp_number || ''}
                      onChange={(e) => updateProperty(i, 'tdArpNumber', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={p.locationOfProperty || p.location_of_property || ''}
                      onChange={(e) => updateProperty(i, 'locationOfProperty', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={p.lotNumber || p.lot_number || ''}
                      onChange={(e) => updateProperty(i, 'lotNumber', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={p.titleNumber || p.title_number || ''}
                      onChange={(e) => updateProperty(i, 'titleNumber', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={p.area || ''}
                      onChange={(e) => updateProperty(i, 'area', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      value={p.assessedValue || p.assessed_value || 0}
                      onChange={(e) => updateProperty(i, 'assessedValue', e.target.value)}
                      style={{ ...inputStyle, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => removePropertyRow(i)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTaxDecEdit = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <div><label style={editLabelStyle}>ARP No.</label><input type="text" value={editData?.taxDeclarationNumber || editData?.tax_declaration_number || ''} onChange={(e) => setEditData({ ...editData, taxDeclarationNumber: e.target.value })} style={inputStyle} /></div>
        <div><label style={editLabelStyle}>PIN</label><input type="text" value={editData?.propertyIndexNumber || editData?.property_index_number || ''} onChange={(e) => setEditData({ ...editData, propertyIndexNumber: e.target.value })} style={inputStyle} /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div><label style={editLabelStyle}>Owner Name</label><input type="text" value={editData?.ownerName || editData?.owner_name || ''} onChange={(e) => setEditData({ ...editData, ownerName: e.target.value })} style={inputStyle} /></div>
        <div><label style={editLabelStyle}>Owner Address</label><input type="text" value={editData?.ownerAddress || editData?.owner_address || ''} onChange={(e) => setEditData({ ...editData, ownerAddress: e.target.value })} style={inputStyle} /></div>
        <div><label style={editLabelStyle}>Administrator Name</label><input type="text" value={editData?.administratorName || editData?.administrator_name || ''} onChange={(e) => setEditData({ ...editData, administratorName: e.target.value })} style={inputStyle} /></div>
        <div><label style={editLabelStyle}>Administrator Address</label><input type="text" value={editData?.administratorAddress || editData?.administrator_address || ''} onChange={(e) => setEditData({ ...editData, administratorAddress: e.target.value })} style={inputStyle} /></div>
      </div>

      <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
        <label style={editLabelStyle}>Boundaries</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={{ fontSize: '10px', color: '#6b7280' }}>NORTH</label><input type="text" value={editData?.boundaryNorth || editData?.boundary_north || ''} onChange={(e) => setEditData({ ...editData, boundaryNorth: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: '10px', color: '#6b7280' }}>SOUTH</label><input type="text" value={editData?.boundarySouth || editData?.boundary_south || ''} onChange={(e) => setEditData({ ...editData, boundarySouth: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: '10px', color: '#6b7280' }}>EAST</label><input type="text" value={editData?.boundaryEast || editData?.boundary_east || ''} onChange={(e) => setEditData({ ...editData, boundaryEast: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ fontSize: '10px', color: '#6b7280' }}>WEST</label><input type="text" value={editData?.boundaryWest || editData?.boundary_west || ''} onChange={(e) => setEditData({ ...editData, boundaryWest: e.target.value })} style={inputStyle} /></div>
        </div>
      </div>

      {/* KIND OF PROPERTY & VALUATION TABLE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>KIND OF PROPERTY &amp; VALUATION</span>
          <button
            onClick={addAssessmentRow}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={14} /> Add Row
          </button>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={thStyle}>Kind of Property</th>
                <th style={thStyle}>Classification</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Market Value (₱)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Assess. Level (%)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Assessed Value (₱)</th>
                <th style={thStyle}>Area</th>
                <th style={{ ...thStyle, textAlign: 'center' }}> </th>
              </tr>
            </thead>
            <tbody>
              {(editData?.assessments || []).length === 0 && (
                <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>No assessments added.</td></tr>
              )}
              {(editData?.assessments || []).map((a: any, i: number) => {
                const mv = parseFloat(a.marketValue || a.market_value) || 0;
                const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
                const av = (mv * lvl) / 100;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={a.kindOfProperty || a.kind_of_property || ''}
                        onChange={(e) => updateAssessment(i, 'kindOfProperty', e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={a.classificationLabel || a.classification_label || ''}
                        onChange={(e) => updateAssessment(i, 'classificationLabel', e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        value={mv}
                        onChange={(e) => updateAssessment(i, 'marketValue', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'right' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        value={lvl}
                        onChange={(e) => updateAssessment(i, 'assessmentLevel', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#166534' }}>
                      ₱ {formatCurrency(av)}
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={a.area || ''}
                        onChange={(e) => updateAssessment(i, 'area', e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => removeAssessmentRow(i)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot style={{ backgroundColor: '#f9fafb', fontWeight: 700, borderTop: '2px solid #d1d5db' }}>
              <tr>
                <td colSpan={2} style={tdStyle}>TOTALS</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>₱ {formatCurrency(editData?.assessments?.reduce((sum: number, a: any) => sum + (parseFloat(a.marketValue || a.market_value) || 0), 0) || 0)}</td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#166534' }}>₱ {formatCurrency(editData?.assessments?.reduce((sum: number, a: any) => {
                  const mv = parseFloat(a.marketValue || a.market_value) || 0;
                  const lvl = parseFloat(a.assessmentLevel || a.assessment_level) || 0;
                  return sum + (mv * lvl) / 100;
                }, 0) || 0)}</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={editLabelStyle}>Taxability</label>
          <select value={editData?.taxability || 'TAXABLE'} onChange={(e) => setEditData({ ...editData, taxability: e.target.value })} style={inputStyle}>
            <option value="TAXABLE">TAXABLE</option>
            <option value="EXEMPT">EXEMPT</option>
          </select>
        </div>
        <div>
          <label style={editLabelStyle}>Effectivity Year</label>
          <input type="number" value={editData?.effectivityYear || editData?.effectivity_year || ''} onChange={(e) => setEditData({ ...editData, effectivityYear: e.target.value })} style={inputStyle} />
        </div>
      </div>
    </div>
  );

  const modalContent = (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEditing ? <><EditIcon size={17} /> Full Document Edit</> : <><SearchIcon size={17} /> Initial Document Preview</>}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
          {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Reference Number</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{documentItem.referenceNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Document Type</span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#4f46e5' }}>{documentItem.documentType}</div>
            </div>
          </div>

          {!isEditing ? (
            isLoadingData ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading complete form details...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Base Request Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: docType === 'NO_LANDHOLDING' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                  <div><span style={labelStyle}>DECLARANT / OWNER NAME</span><div style={{ ...valueStyle, fontSize: '16px' }}>{formData.declarantName || 'N/A'}</div></div>
                  <div><span style={labelStyle}>REQUESTED BY (CLIENT)</span><div style={{ ...valueStyle, fontSize: '16px' }}>{formData.requestedByName || 'N/A'}</div></div>
                  {docType !== 'NO_LANDHOLDING' && (
                    <div><span style={labelStyle}>PROPERTY LOCATION</span><div style={{ ...valueStyle, fontSize: '16px' }}>{formData.propertyLocation || 'N/A'}</div></div>
                  )}
                </div>

                <hr style={{ borderTop: '1px dashed #d1d5db', borderBottom: 'none' }} />

                {fetchError && (
                  <div style={{ color: '#b91c1c', padding: 12, backgroundColor: '#fee2e2', borderRadius: 6 }}>
                    {fetchError}
                  </div>
                )}
                {!fetchError && !fullData && (
                  <div style={{ color: '#92400e', padding: 16, backgroundColor: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                    This document hasn't been encoded yet. Click <strong>Edit Full Document</strong> below to fill in the details.
                  </div>
                )}
                {!fetchError && fullData && docType === 'NO_LANDHOLDING' && renderNoLandholdingPreview()}
                {!fetchError && fullData && docType === 'LANDHOLDING' && renderLandholdingPreview()}
                {!fetchError && fullData && docType === 'TAX_DEC' && renderTaxDecPreview()}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                <strong>Editing Mode:</strong> Update any field below to correct typos or incorrect data.
              </div>

              {/* Base Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: docType === 'NO_LANDHOLDING' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '16px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                <div>
                  <label style={editLabelStyle}>Declarant / Owner Name *</label>
                  <textarea
                    ref={declarantNameEditRef}
                    rows={1}
                    value={formData.declarantName}
                    onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })}
                    style={{
                      ...inputStyle,
                      resize: 'none',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                    }}
                  />
                </div>
                <div>
                  <label style={editLabelStyle}>Requested By Name</label>
                  <input type="text" value={formData.requestedByName} onChange={(e) => setFormData({ ...formData, requestedByName: e.target.value })} style={inputStyle} />
                </div>
                {docType !== 'NO_LANDHOLDING' && (
                  <div style={{ position: 'relative' }}>
                    <label style={editLabelStyle}>Property Location</label>
                    <input
                      type="text"
                      value={formData.propertyLocation}
                      onChange={(e) => { setFormData({ ...formData, propertyLocation: e.target.value }); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Select or type..."
                      style={inputStyle}
                    />
                    {showSuggestions && filtered.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10000,
                        background: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
                        maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}>
                        {filtered.map((loc, i) => (
                          <div key={i}
                            onMouseDown={() => { setFormData({ ...formData, propertyLocation: loc }); setShowSuggestions(false); }}
                            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >{loc}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr style={{ borderTop: '1px dashed #d1d5db', borderBottom: 'none', margin: 0 }} />

              {docType === 'NO_LANDHOLDING' && renderNoLandholdingEdit()}
              {docType === 'LANDHOLDING' && renderLandholdingEdit()}
              {docType === 'TAX_DEC' && renderTaxDecEdit()}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <EditIcon size={15} /> Edit Full Document
              </button>
              <button onClick={onClose} style={{ backgroundColor: '#374151', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
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

// Inline styling helpers
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '4px' };
const valueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 500, color: '#111827' };
const thStyle: React.CSSProperties = { padding: '10px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', wordBreak: 'break-word' };
const tdStyle: React.CSSProperties = { padding: '10px', color: '#1f2937', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' };
const editLabelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' };