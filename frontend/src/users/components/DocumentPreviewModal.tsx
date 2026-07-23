import React, { useState } from 'react';
import { createPortal } from 'react-dom'; // <--- IMPORT THIS
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';

// CORRECT PATH based on your screenshot
import '../styles/DocumentPreviewModal.css';

// Import your 3 templates
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
    signatory1Name: string;
    signatory1Title?: string;
    onClose: () => void;
    onConfirmRelease: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    documents,
    orNumber,
    datePaid,
    signatory1Name,
    signatory1Title = 'Municipal Assessor',
    onClose,
    onConfirmRelease
}) => {
    const [isReleased, setIsReleased] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const activeDocument = documents[activeIndex];

    const renderDocumentTemplate = (doc: DocumentItem) => {
        switch (doc.type) {
            case 'TAX_DEC':
                return (
                    <TaxDeclarationPDF
                        data={doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory={signatory1Name}
                    />
                );
            case 'LANDHOLDING':
                return (
                    <CertOfLandholdingPDF
                        {...doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory1Name={signatory1Name}
                        signatory1Title={signatory1Title}
                    />
                );
            case 'NO_LANDHOLDING':
                return (
                    <CertOfNoLandholdingPDF
                        {...doc.data}
                        orNumber={orNumber}
                        datePaid={datePaid}
                        signatory1Name={signatory1Name}
                        signatory1Title={signatory1Title}
                    />
                );
            default:
                return null;
        }
    };

    const activePDFComponent = renderDocumentTemplate(activeDocument);

    const handleRelease = () => {
        onConfirmRelease();
        setIsReleased(true);
    };

    // The actual modal UI
    const modalContent = (
        <div className="preview-modal-overlay">

            {/* LEFT SIDE: Tabs and PDF Viewer */}
            <div className="preview-modal-left">

                {/* TABS: Only show if there is more than 1 document */}
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

                {/* The Actual PDF Viewer window */}
                <div className="preview-viewer-container">
                    {activePDFComponent && (
                        <PDFViewer width="100%" height="100%" style={{ border: 'none', width: '100%', height: '100%' }}>
                            {activePDFComponent}
                        </PDFViewer>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Action Panel */}
            <div className="preview-modal-right">
                <h2 className="pm-title">Document Actions</h2>

                <div className="pm-info-box">
                    Viewing Document {activeIndex + 1} of {documents.length}: <br />
                    <strong>{activeDocument.title}</strong>
                </div>

                <p className="pm-description">
                    Please review the generated document(s) carefully. You can use the built-in viewer controls to print.
                </p>

                <div className="pm-actions-wrapper">

                    {/* Dedicated Download Button for the currently viewed tab */}
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

                    {/* Confirm & Release Transaction */}
                    <button
                        onClick={handleRelease}
                        disabled={isReleased}
                        className={`pm-btn ${isReleased ? 'pm-btn-disabled' : 'pm-btn-success'}`}
                    >
                        {isReleased ? 'Transaction Released ✓' : `Confirm & Release All (${documents.length})`}
                    </button>

                    {/* Cancel/Close Button */}
                    <button onClick={onClose} className="pm-btn pm-btn-text">
                        Close & Edit Details
                    </button>
                </div>
            </div>

        </div>
    );

    // THIS IS THE MAGIC: createPortal injects the modal directly into the <body> tag, 
    // bypassing all layout issues!
    return createPortal(modalContent, document.body);
};