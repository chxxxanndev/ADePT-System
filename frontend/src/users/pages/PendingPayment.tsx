import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import '../styles/PendingPayment.css';

// SVG Icons
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ArchiveIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;

function resolveDocTypeName(req: any): string {
    if (req.request_documents && req.request_documents.length > 0) {
        return req.request_documents
            .map((rd: any) => rd.document_types?.name)
            .filter(Boolean).join(', ');
    }
    // If NLH exists in ref, use that as a logical fallback
    if (req.reference_number?.startsWith('NLH')) return 'Certificate of No Landholding';
    if (req.reference_number?.startsWith('LH')) return 'Certificate of Landholding';
    return 'Certified True Tax Declaration';
}

export function PendingPayment({ onSelectPayment }: any) {
    const [payments, setPayments] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLivePayments = async () => {
            try {
                setLoading(true);
                const rawRequests = await requestService.getRequests();

                if (Array.isArray(rawRequests)) {
                    const mapped = rawRequests
                        .filter((r: any) => r.status === 'PENDING_PAYMENT' || r.action_taken === 'PENDING')
                        .map((req: any) => ({
                            id: req.id,
                            refNumber: req.reference_number || "REF-PENDING",
                            controlNumber: req.reference_number || "REF-PENDING",
                            declarant: req.declarant_name || 'N/A',
                            declarant_name: req.declarant_name || 'N/A',
                            docType: resolveDocTypeName(req),
                            documentType: resolveDocTypeName(req),
                            amount: 40.00,
                            amountDue: 40.00,
                            date: req.request_date || 'N/A',
                            dateRequested: req.request_date || 'N/A',
                            status: req.status || 'PENDING_PAYMENT'
                        }));
                    setPayments(mapped);
                }
            } catch (error) { console.error("Error:", error); }
            finally { setLoading(false); }
        };
        fetchLivePayments();
    }, []);

    const handleArchive = async (e: React.MouseEvent, refNo: string, uuid: string) => {
        e.stopPropagation();
        if (confirm(`Move Reference No. "${refNo}" to Archive?`)) {
            try {
                // Logic Change: Update status to ARCHIVED instead of deleting
                await requestService.updateRequest(uuid, { status: 'ARCHIVED' });

                // Remove from current UI list
                setPayments(prev => prev.filter(p => p.id !== uuid));
                alert("Record moved to Archive Management.");
            } catch (error) {
                alert("Failed to archive record.");
            }
        }
    };

    const filtered = payments.filter(p =>
        p.refNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.declarant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.docType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="pp-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#29237a', margin: 0, fontWeight: 800 }}>Pending Payments Queue</h2>
                <div style={{ display: 'flex', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #ddd', width: '320px' }}>
                    <SearchIcon />
                    <input
                        placeholder="Search Reference No., Name..."
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', marginLeft: '10px' }}
                    />
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={{ padding: '14px 20px' }}>Reference Number</th>
                            <th style={{ padding: '14px 20px' }}>Declarant Name</th>
                            <th style={{ padding: '14px 20px' }}>Document Type</th>
                            <th style={{ padding: '14px 20px' }}>Amount Due</th>
                            <th style={{ padding: '14px 20px' }}>Date</th>
                            <th style={{ padding: '14px 20px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr> :
                            filtered.map((p) => (
                                <tr key={p.id} onClick={() => onSelectPayment(p)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                                    <td style={{ padding: '16px 20px', fontWeight: 700, fontFamily: 'monospace' }}>{p.refNumber}</td>
                                    <td style={{ padding: '16px 20px' }}>{p.declarant}</td>
                                    <td style={{ padding: '16px 20px' }}><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{p.docType}</span></td>
                                    <td style={{ padding: '16px 20px', fontWeight: 800, color: '#059669' }}>₱{p.amount.toFixed(2)}</td>
                                    <td style={{ padding: '16px 20px' }}>{p.date}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <button onClick={(e) => handleArchive(e, p.refNumber, p.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                                            <ArchiveIcon /> Archive
                                        </button>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}