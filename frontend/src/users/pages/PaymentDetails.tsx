import { useState, useEffect } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { landholdingService } from '../services/landholdingService';
import { noLandholdingService } from '../services/noLandholdingService';

interface PaymentDetailsProps {
    payment: PendingPaymentRequest | null;
    onBack: () => void;
    onEditDocument: (controlNumber: string) => void;
}

export function PaymentDetails({ payment, onBack, onEditDocument }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [showSharedWarning, setShowSharedWarning] = useState(false);
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    useEffect(() => {
        if (!payment) return;
        const fetchFormPreview = async () => {
            setLoading(true);
            try {
                const controlNo = payment.controlNumber || payment.refNumber || '';
                const reqId = payment.id;
                if (controlNo.startsWith('NLH')) {
                    const res = await noLandholdingService.getByRequestId(reqId);
                    setFormData(res);
                } else if (controlNo.startsWith('LH')) {
                    const res = await landholdingService.getByRequestId(reqId);
                    setFormData(res);
                } else {
                    const res = await taxDeclarationService.getByRequestId(reqId);
                    setFormData(res?.data || res);
                }
            } catch (err) {
                console.error("Error fetching form details for preview:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFormPreview();
    }, [payment]);

    if (!payment) return <div style={{ padding: '40px' }}>Payment data missing.</div>;

    const handleVerify = () => {
        if (!orNumber || !signatory) return alert("O.R. Number and Signatory are required.");

        // SETBACK 1 LOGIC: The "Shared Receipt" Bulk Payment Collision
        const isDuplicateInDatabase = orNumber === "12345";

        if (isDuplicateInDatabase && !showSharedWarning) {
            setShowSharedWarning(true);
            return;
        }

        setIsVerified(true);
        setShowSharedWarning(false);
    };

    const handlePrint = () => {
        window.print();
        alert(`Document ${payment.controlNumber} marked as RELEASED.`);
        onBack(); // Go back to the queue
    };

    const isNlh = (payment.controlNumber || payment.refNumber || '').startsWith('NLH');
    const isLh = (payment.controlNumber || payment.refNumber || '').startsWith('LH');

    // Mapped Form Data fields handling both camelCase and snake_case
    const declarantName = formData?.declarant_name || formData?.declarantName || payment.declarant_name || payment.declarant || '';
    const dateGiven = formData?.date_given || formData?.dateGiven || '';
    const givenAt = formData?.given_at || formData?.givenAt || '';
    const purpose = formData?.purpose || '';

    // Render Preview Section
    const renderFormPreview = () => {
        if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading exact form details...</div>;
        if (!formData) return <div style={{ padding: '20px', color: '#94a3b8', fontStyle: 'italic' }}>No entry form details available.</div>;

        if (isNlh) {
            const pronoun = formData.pronoun || 'His';
            const count = formData.property_count || formData.propertyCount || 'singular';
            return (
                <div style={{ background: '#FAF9FF', border: '1px solid #E3E0FA', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
                    <h3 style={{ color: '#2B2A6E', margin: '0 0 12px 0', fontSize: '16px' }}>Certificate Form Preview</h3>
                    <div style={{ fontStyle: 'italic', color: '#475569', lineHeight: '1.6', padding: '12px', borderLeft: '3px solid #2B2A6E', background: '#fff' }}>
                        <p>This is to certify that according to the records of this office, <strong>{declarantName}</strong> has no landholding registered for taxation purposes.</p>
                        <p><strong>Pronoun:</strong> {pronoun} | <strong>Property Count:</strong> {count}</p>
                        <p><strong>Purpose:</strong> {purpose || 'N/A'}</p>
                        <p><strong>Given Date:</strong> {dateGiven} | <strong>Given At:</strong> {givenAt}</p>
                    </div>
                </div>
            );
        }

        if (isLh) {
            const ownershipType = formData.ownership_type || formData.ownershipType || 'single';
            const propertyRows = formData.encoded_landholding_property_rows || formData._propertyRows || formData.propertyRows || [];
            return (
                <div style={{ background: '#FAF9FF', border: '1px solid #E3E0FA', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
                    <h3 style={{ color: '#2B2A6E', margin: '0 0 12px 0', fontSize: '16px' }}>Certificate Form Preview</h3>
                    <div style={{ color: '#475569', lineHeight: '1.6', padding: '12px', borderLeft: '3px solid #2B2A6E', background: '#fff', marginBottom: '12px' }}>
                        <p><strong>Ownership Type:</strong> {ownershipType}</p>
                        <p><strong>Purpose:</strong> {purpose || 'N/A'}</p>
                        <p><strong>Given Date:</strong> {dateGiven} | <strong>Given At:</strong> {givenAt}</p>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#EEF2FF', textAlign: 'left' }}>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>TD/ARP No.</th>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Location</th>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Lot No.</th>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Title No.</th>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Area</th>
                                <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Assessed Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {propertyRows.map((row: any, i: number) => (
                                <tr key={i}>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.td_arp_number || row.tdArpNumber}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.location_of_property || row.locationOfProperty}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.lot_number || row.lotNumber}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.title_number || row.titleNumber}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.area}</td>
                                    <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₱{Number(row.assessed_value || row.assessedValue || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Default: Tax Declaration Preview
        const arpNo = formData.tax_declaration_number || formData.taxDeclarationNumber || '';
        const pin = formData.property_identification_number || formData.propertyIndexNumber || '';
        const adminName = formData.administrator_name || formData.administratorName || '';
        const effectivityYear = formData.effectivity_year || formData.effectivityYear || '';
        const assessmentRows = formData.encoded_assessment_rows || formData._assessmentRows || formData.assessmentRows || [];
        const totalMarketValue = formData.total_market_value || formData.totalMarketValue || 0;
        const totalAssessedValue = formData.total_assessed_value || formData.totalAssessedValue || 0;
        const amountInWords = formData.amount_in_words || formData.amountInWords || '';

        return (
            <div style={{ background: '#FAF9FF', border: '1px solid #E3E0FA', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
                <h3 style={{ color: '#2B2A6E', margin: '0 0 12px 0', fontSize: '16px' }}>Tax Declaration Form Preview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#475569', background: '#fff', padding: '12px', borderLeft: '3px solid #2B2A6E', borderRadius: '4px', marginBottom: '12px' }}>
                    <div><strong>ARP No:</strong> {arpNo}</div>
                    <div><strong>PIN:</strong> {pin}</div>
                    <div><strong>Owner:</strong> {declarantName}</div>
                    <div><strong>Admin:</strong> {adminName || 'None'}</div>
                    <div><strong>Effectivity Year:</strong> {effectivityYear}</div>
                    <div><strong>Taxability:</strong> {formData.taxability || 'TAXABLE'}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}><strong>Boundaries:</strong> North: {formData.boundary_north || formData.boundaryNorth || 'N/A'} | South: {formData.boundary_south || formData.boundarySouth || 'N/A'} | East: {formData.boundary_east || formData.boundaryEast || 'N/A'} | West: {formData.boundary_west || formData.boundaryWest || 'N/A'}</div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#EEF2FF', textAlign: 'left' }}>
                            <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Kind of Property</th>
                            <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Classification</th>
                            <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Market Value</th>
                            <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Ass. Level</th>
                            <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Assessed Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assessmentRows.map((row: any, i: number) => (
                            <tr key={i}>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.kind_of_property || row.kindOfProperty || 'Land'}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.classification_id || row.classificationId || 'Residential'}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₱{Number(row.market_value || row.marketValue || 0).toFixed(2)}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{row.assessment_level || row.assessmentLevel || 0}%</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>₱{Number(row.assessed_value || row.assessedValue || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                            <td colSpan={2} style={{ padding: '8px', border: '1px solid #cbd5e1' }}>TOTALS</td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₱{Number(totalMarketValue).toFixed(2)}</td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}></td>
                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>₱{Number(totalAssessedValue).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}><strong>Amount in Words:</strong> {amountInWords}</div>
            </div>
        );
    };

    // Print-Ready Document Output Layout
    const renderPrintReadyDocument = () => {
        if (!formData) return null;

        const appSignatory = signatory || "ENGR. VICENTE P. DESOY";

        return (
            <div className="print-ready-document" style={{ background: '#fff', color: '#000', padding: '40px', fontFamily: 'serif', lineHeight: '1.6' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>Republic of the Philippines</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase' }}>Office of the Provincial Assessor</div>
                    <div style={{ fontSize: '12px' }}>Province of Zamboanga del Norte</div>
                </div>

                {isNlh && (
                    <div>
                        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '40px', fontSize: '20px', letterSpacing: '2px' }}>Certification</h2>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '20px' }}>
                            <strong>TO WHOM IT MAY CONCERN:</strong>
                        </p>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '20px' }}>
                            THIS IS TO CERTIFY that according to the records of this office, <strong>{declarantName.toUpperCase()}</strong> has no real property/landholding registered in his/her name for taxation purposes in the Province of Zamboanga del Norte.
                        </p>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '40px' }}>
                            This certification is issued upon the request of the above-named party for <strong>{purpose.toUpperCase() || 'LEGAL PURPOSES'}</strong>.
                        </p>
                        <p style={{ fontSize: '16px', marginBottom: '60px' }}>
                            Given this {dateGiven || new Date().toLocaleDateString()} at {givenAt || 'Dipolog City, Philippines'}.
                        </p>
                    </div>
                )}

                {isLh && (
                    <div>
                        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '30px', fontSize: '20px', letterSpacing: '2px' }}>Certification of Landholding</h2>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '20px' }}>
                            <strong>TO WHOM IT MAY CONCERN:</strong>
                        </p>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '20px' }}>
                            THIS IS TO CERTIFY that according to the records of this office, <strong>{declarantName.toUpperCase()}</strong> has the following real property/landholding registered for taxation purposes in the Province of Zamboanga del Norte:
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '30px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left' }}>
                                    <th style={{ padding: '6px' }}>TD/ARP Number</th>
                                    <th style={{ padding: '6px' }}>Location</th>
                                    <th style={{ padding: '6px' }}>Lot No.</th>
                                    <th style={{ padding: '6px' }}>Title No.</th>
                                    <th style={{ padding: '6px' }}>Area</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Assessed Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.encoded_landholding_property_rows || formData._propertyRows || formData.propertyRows || []).map((row: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px dashed #ccc' }}>
                                        <td style={{ padding: '6px' }}>{row.td_arp_number || row.tdArpNumber}</td>
                                        <td style={{ padding: '6px' }}>{row.location_of_property || row.locationOfProperty}</td>
                                        <td style={{ padding: '6px' }}>{row.lot_number || row.lotNumber}</td>
                                        <td style={{ padding: '6px' }}>{row.title_number || row.titleNumber}</td>
                                        <td style={{ padding: '6px' }}>{row.area}</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>₱{Number(row.assessed_value || row.assessedValue || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p style={{ textIndent: '50px', fontSize: '16px', textAlign: 'justify', marginBottom: '40px' }}>
                            This certification is issued for <strong>{purpose.toUpperCase() || 'LEGAL PURPOSES'}</strong>.
                        </p>
                        <p style={{ fontSize: '16px', marginBottom: '60px' }}>
                            Given this {dateGiven || new Date().toLocaleDateString()} at {givenAt || 'Dipolog City, Philippines'}.
                        </p>
                    </div>
                )}

                {!isNlh && !isLh && (
                    <div>
                        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '20px', fontSize: '18px' }}>Declaration of Real Property</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px', marginBottom: '20px', border: '1px solid #000', padding: '15px' }}>
                            <div><strong>ARP Number:</strong> {formData.tax_declaration_number || formData.taxDeclarationNumber}</div>
                            <div><strong>PIN:</strong> {formData.property_identification_number || formData.propertyIndexNumber}</div>
                            <div><strong>Owner Name:</strong> {declarantName.toUpperCase()}</div>
                            <div><strong>Address:</strong> {formData.owner_address || formData.ownerAddress || 'N/A'}</div>
                            <div><strong>Taxability:</strong> {formData.taxability || 'TAXABLE'}</div>
                            <div><strong>Effectivity Year:</strong> {formData.effectivity_year || formData.effectivityYear}</div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '25px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left' }}>
                                    <th style={{ padding: '6px' }}>Property Kind</th>
                                    <th style={{ padding: '6px' }}>Classification</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Market Value</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Ass. Level</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Assessed Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.encoded_assessment_rows || formData._assessmentRows || formData.assessmentRows || []).map((row: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px dashed #ccc' }}>
                                        <td style={{ padding: '6px' }}>{row.kind_of_property || row.kindOfProperty || 'Land'}</td>
                                        <td style={{ padding: '6px' }}>{row.classification_id || row.classificationId || 'Residential'}</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>₱{Number(row.market_value || row.marketValue || 0).toFixed(2)}</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>{row.assessment_level || row.assessmentLevel || 0}%</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>₱{Number(row.assessed_value || row.assessedValue || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                                    <td colSpan={2} style={{ padding: '6px' }}>TOTALS:</td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>₱{Number(formData.total_market_value || formData.totalMarketValue || 0).toFixed(2)}</td>
                                    <td></td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>₱{Number(formData.total_assessed_value || formData.totalAssessedValue || 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p style={{ fontSize: '14px', fontStyle: 'italic', marginBottom: '40px' }}>
                            <strong>Amount in Words:</strong> {formData.amount_in_words || formData.amountInWords}
                        </p>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
                    <div style={{ fontSize: '12px' }}>
                        <div><strong>Official Receipt No:</strong> {orNumber || 'N/A'}</div>
                        <div><strong>Amount Paid:</strong> ₱{payment.amountDue.toFixed(2)}</div>
                        <div><strong>Date Paid:</strong> {new Date().toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{appSignatory}</div>
                        <div style={{ fontSize: '12px', color: '#555' }}>Authorized Representative</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-ready-document, .print-ready-document * {
                        visibility: visible;
                    }
                    .print-ready-document {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .dashboard-page, .sidebar, .dashboard-main, .pp-page, button, input, select, .pd-back-btn {
                        display: none !important;
                    }
                }
            `}</style>

            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>
                &larr; Back to Queue
            </button>

            {showPrintPreview ? (
                <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(41, 35, 122, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <button onClick={() => setShowPrintPreview(false)} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ← Back to Details
                        </button>
                        <button onClick={handlePrint} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            🖨️ Confirm & Print Document
                        </button>
                    </div>
                    <div style={{ border: '1px solid #ddd', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        {renderPrintReadyDocument()}
                    </div>
                </div>
            ) : (
                <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(41, 35, 122, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
                        <h2 style={{ color: '#29237a', margin: 0 }}>Payment & Document Release</h2>
                        <button
                            onClick={() => onEditDocument(payment.controlNumber)}
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                        >
                            ✏️ Edit Document Typo
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Control Number</p>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{payment.controlNumber}</h3>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Declarant Name</p>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{payment.declarant_name}</h3>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Type</p>
                            <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>{payment.documentType}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calculated Fee</p>
                            <h2 style={{ margin: 0, color: '#059669', fontSize: '24px' }}>₱{payment.amountDue.toFixed(2)}</h2>
                        </div>
                    </div>

                    {/* Exact Form Preview Area */}
                    {renderFormPreview()}

                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '24px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>Official Receipt & Signatories</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>O.R. Number</label>
                                <input
                                    type="text"
                                    placeholder="Enter receipt number..."
                                    value={orNumber}
                                    onChange={(e) => { setOrNumber(e.target.value); setIsVerified(false); }}
                                    disabled={isVerified}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Authorized Signatory</label>
                                <select
                                    value={signatory}
                                    onChange={(e) => setSignatory(e.target.value)}
                                    disabled={isVerified}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }}
                                >
                                    <option value="">-- Select Signatory --</option>
                                    <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY (Provincial Assessor)</option>
                                    <option value="ELVIRA T. ENAO">ELVIRA T. ENAO (LAOO IV)</option>
                                    <option value="ISAGANI B. EMBOL">ISAGANI B. EMBOL (LAOO II)</option>
                                </select>
                            </div>
                        </div>

                        {showSharedWarning && (
                            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e', padding: '14px', borderRadius: '8px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <strong>⚠️ Duplicate O.R. Detected:</strong><br />
                                    This receipt was recently used. Is this a bulk/shared receipt?
                                </div>
                                <button onClick={handleVerify} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Yes, Override & Proceed
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                        {!isVerified ? (
                            <button
                                onClick={handleVerify}
                                style={{ background: 'linear-gradient(135deg, #29237a 0%, #3730a3 100%)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(41,35,122,0.2)' }}
                            >
                                Verify O.R. & Unlock Printing
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowPrintPreview(true)}
                                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                            >
                                📄 Generate Print-Ready Document
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}