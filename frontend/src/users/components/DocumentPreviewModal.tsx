import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';

import '../styles/DocumentPreviewModal.css';

import { TaxDeclarationPDF } from './templates/TaxDeclarationPDF';
import { CertOfLandholdingPDF } from './templates/LandholdingPDF';
import { CertOfNoLandholdingPDF } from './templates/NoLandholdingPDF';

export interface DocumentItem {
    id: string;
    type: 'TAX_DEC' | 'LANDHOLDING' | 'NO_LANDHOLDING';
    title: string;
    data: any;
}

interface DocumentPreviewModalProps {
    documents: DocumentItem[];
    orNumber: string;
    datePaid: string;
    signatory1Name?: string;
    signatory1Title?: string;
    onClose: () => void;
    onConfirmRelease: (selectedSignatory: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    documents,
    orNumber,
    datePaid,
    signatory1Title = 'Municipal Assessor',
    onClose,
    onConfirmRelease
}) => {
    const [isReleased, setIsReleased] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedSignatory, setSelectedSignatory] = useState('ELVIRA T. ENAO, REA');
    const [signatoryError, setSignatoryError] = useState('');

    const activeDocument = documents[activeIndex];

    const renderDocumentTemplate = (doc: DocumentItem) => {
        switch (doc.type) {
            case 'TAX_DEC':
                return (
                    <TaxDeclarationPDF
                        data={doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory={selectedSignatory}
                    />
                );
            case 'LANDHOLDING':
                return (
                    <CertOfLandholdingPDF
                        {...doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory1Name={selectedSignatory}
                        signatory1Title={signatory1Title}
                    />
                );
            case 'NO_LANDHOLDING':
                return (
                    <CertOfNoLandholdingPDF
                        {...doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory1Name={selectedSignatory}
                        signatory1Title={signatory1Title}
                    />
                );
            default:
                return null;
        }
    };

    const activePDFComponent = renderDocumentTemplate(activeDocument);

    const handleRelease = () => {
        if (!selectedSignatory) {
            setSignatoryError('Please select an authorized signatory before generating and releasing.');
            return;
        }
        setSignatoryError('');
        onConfirmRelease(selectedSignatory);
        setIsReleased(true);
    };

    const modalContent = (
        <div className="preview-modal-overlay">
            {/* LEFT SIDE: Tabs and PDF Viewer */}
            <div className="preview-modal-left">
                {documents.length > 1 && (
                    <div className="preview-modal-tabs">
                        {documents.map((doc, index) => (
                            <button
                                key={doc.id}
                                onClick={() => setActiveIndex(index)}
                                className={`preview-tab-btn ${activeIndex === index ? 'active' : 'inactive'}`}
                            >
                                {doc.title}
                            </button>
                        ))}
                    </div>
                )}

                <div className="preview-viewer-container">
                    {activePDFComponent && (
                        <PDFViewer width="100%" height="100%" style={{ border: 'none', width: '100%', height: '100%' }}>
                            {activePDFComponent}
                        </PDFViewer>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Action & Final Lock Panel */}
            <div className="preview-modal-right">
                <h2 className="pm-title">Final Signatory & Lock</h2>

                <div className="pm-info-box">
                    Viewing Document {activeIndex + 1} of {documents.length}: <br />
                    <strong>{activeDocument.title}</strong>
                </div>

                {/* SIGNATORY SELECTION AT FINAL LOCKING STAGE */}
                <div style={{ margin: '16px 0' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        Select Authorized Signatory *
                    </label>
                    <select
                        value={selectedSignatory}
                        onChange={(e) => setSelectedSignatory(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        <option value="">-- Select Signatory --</option>
                        <option value="ELVIRA T. ENAO, REA">ELVIRA T. ENAO, REA</option>
                        <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY</option>
                        <option value="CHINA CHAN-OLARIO, RN, REA, REB, Enp">CHINA CHAN-OLARIO, RN, REA, REB, Enp</option>
                    </select>
                    {signatoryError && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{signatoryError}</span>}
                </div>

                <p className="pm-description">
                    Review the generated document. Selecting a signatory updates the PDF live before locking.
                </p>

                <div className="pm-actions-wrapper">
                    {activePDFComponent && (
                        <PDFDownloadLink
                            document={activePDFComponent}
                            fileName={`${activeDocument.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                            className="pm-btn pm-btn-outline"
                        >
                            {({ loading }) => (loading ? 'Preparing PDF...' : 'Download Current PDF')}
                        </PDFDownloadLink>
                    )}

                    <div className="pm-divider"></div>

                    <button
                        onClick={handleRelease}
                        disabled={isReleased}
                        className={`pm-btn ${isReleased ? 'pm-btn-disabled' : 'pm-btn-success'}`}
                    >
                        {isReleased ? 'Transaction Released ✓' : `Confirm Signatory & Lock (${documents.length})`}
                    </button>

                    <button onClick={onClose} className="pm-btn pm-btn-text">
                        Close & Edit Details
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};