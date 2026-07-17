import { useMemo, useState } from 'react';
import type { PendingPaymentRequest } from '../../types/PendingPayment';
import '../../styles/PaymentDetails.css';

interface OrValidationPageProps {
    documents: PendingPaymentRequest[];
    selectedDocument: PendingPaymentRequest | null;
    onBack: () => void;
    onUpdateDocument: (payment: PendingPaymentRequest) => void;
}

function getDocumentLabel(documentKey?: PendingPaymentRequest['documentKey']) {
    switch (documentKey) {
        case 'tax-declaration':
            return 'Tax Declaration';
        case 'certificate-land-holding':
            return 'Certificate of Landholding';
        case 'certificate-no-landholding':
            return 'Certificate of No Landholding';
        default:
            return 'Document';
    }
}

export function OrValidationPage({ documents, selectedDocument, onBack, onUpdateDocument }: OrValidationPageProps) {
    const [activeDocument, setActiveDocument] = useState<PendingPaymentRequest | null>(selectedDocument ?? documents[0] ?? null);
    const [orNumber, setOrNumber] = useState(activeDocument?.orNumber ?? '');

    const currentDocument = useMemo(() => {
        return activeDocument ?? selectedDocument ?? documents[0] ?? null;
    }, [activeDocument, documents, selectedDocument]);

    const handleSelectDocument = (document: PendingPaymentRequest) => {
        setActiveDocument(document);
        setOrNumber(document.orNumber ?? '');
    };

    const handleSaveOrNumber = () => {
        if (!currentDocument) return;
        const updatedDocument = { ...currentDocument, orNumber, status: 'Pending Validation' as const };
        onUpdateDocument(updatedDocument);
        setActiveDocument(updatedDocument);
    };

    return (
        <div className="pd-page">
            <div className="pd-card" style={{ maxWidth: 980 }}>
                <button type="button" className="pd-back-btn" onClick={onBack}>
                    ← Back to Pending Payment
                </button>

                <h2 className="pd-title">OR Validation</h2>
                <p style={{ marginTop: -8, color: '#6B6875' }}>
                    Select a document, confirm the payment details, and enter the official receipt number.
                </p>

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(240px, 280px) 1fr', marginTop: 20 }}>
                    <div style={{ border: '1px solid #E3E0FA', borderRadius: 12, padding: 12, background: '#FAF9FF' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2A6E', marginBottom: 10 }}>
                            Documents to Validate
                        </div>
                        {documents.length === 0 ? (
                            <div style={{ color: '#6B6875', fontSize: 13 }}>No documents pending validation.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {documents.map((document) => (
                                    <button
                                        key={document.controlNumber}
                                        type="button"
                                        onClick={() => handleSelectDocument(document)}
                                        style={{
                                            textAlign: 'left',
                                            border: currentDocument?.controlNumber === document.controlNumber ? '1px solid #2B2A6E' : '1px solid #E3E0FA',
                                            background: currentDocument?.controlNumber === document.controlNumber ? '#EEF2FF' : '#FFFFFF',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: '#16161F' }}>{document.controlNumber}</div>
                                        <div style={{ fontSize: 12, color: '#6B6875' }}>{document.declarantName}</div>
                                        <div style={{ fontSize: 12, color: '#2B2A6E' }}>{getDocumentLabel(document.documentKey)}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ border: '1px solid #E3E0FA', borderRadius: 12, padding: 20, background: '#FFFFFF' }}>
                        {currentDocument ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#6B6875', textTransform: 'uppercase', letterSpacing: 1 }}>{getDocumentLabel(currentDocument.documentKey)}</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: '#16161F' }}>{currentDocument.controlNumber}</div>
                                    </div>
                                    <span style={{ background: '#E0F2FE', color: '#075985', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                                        {currentDocument.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F0FB', paddingBottom: 10 }}>
                                        <span style={{ color: '#6B6875' }}>Declarant</span>
                                        <strong>{currentDocument.declarantName}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F0FB', paddingBottom: 10 }}>
                                        <span style={{ color: '#6B6875' }}>Amount Due</span>
                                        <strong>{currentDocument.amountDue} Php</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F2F0FB', paddingBottom: 10 }}>
                                        <span style={{ color: '#6B6875' }}>Date Requested</span>
                                        <strong>{currentDocument.dateRequested}</strong>
                                    </div>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <label htmlFor="or-number" style={{ fontWeight: 700, color: '#16161F' }}>Official Receipt Number</label>
                                        <input
                                            id="or-number"
                                            className="td-input"
                                            value={orNumber}
                                            onChange={(e) => setOrNumber(e.target.value)}
                                            placeholder="Enter OR number"
                                        />
                                    </div>
                                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
                                        <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>Document Preview</div>
                                        <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                                            {currentDocument.formSummary?.title && <div><strong>{currentDocument.formSummary.title}</strong></div>}
                                            {currentDocument.formSummary?.ownerName && <div>Owner: {currentDocument.formSummary.ownerName}</div>}
                                            {currentDocument.formSummary?.declarantName && <div>Declarant: {currentDocument.formSummary.declarantName}</div>}
                                            {currentDocument.formSummary?.propertyIndexNumber && <div>Property Index: {currentDocument.formSummary.propertyIndexNumber}</div>}
                                            {currentDocument.formSummary?.taxDeclarationNumber && <div>Tax Declaration No.: {currentDocument.formSummary.taxDeclarationNumber}</div>}
                                            {currentDocument.formSummary?.properties?.map((property) => (
                                                <div key={property.label}>{property.label}: {property.value}</div>
                                            ))}
                                            {currentDocument.formSummary?.notes?.map((note) => (
                                                <div key={note}>{note}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button type="button" className="pd-pay-btn" style={{ flex: 1 }} onClick={handleSaveOrNumber}>
                                        Save OR Number
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div>No document selected.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
