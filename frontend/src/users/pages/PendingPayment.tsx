import { useState, useEffect } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { requestService } from '../services/requestService';
import '../styles/PendingPayment.css';

// SVG Icons
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ArchiveIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;

interface PendingPaymentProps { onSelectPayment: (payment: PendingPaymentRequest) => void; }

// HELPER: Fetches real document names (Fixes General Document bug)
function resolveDocTypeName(req: any): string {
    if (req.request_documents && req.request_documents.length > 0) {
        return req.request_documents.map((rd: any) => rd.document_types?.name).join(', ');
    }
    return 'Certified True Tax Declaration';
}

export function PendingPayment({ onSelectPayment }: PendingPaymentProps) {
    const [payments, setPayments] = useState<PendingPaymentRequest[]>([]);
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
                            controlNumber: req.reference_number || "REF-ERROR", // Source of Truth
                            declarant_name: req.declarant_name || 'N/A',
                            documentType: resolveDocTypeName(req),
                            amountDue: 40.00,
                            dateRequested: req.request_date || 'N/A'
                        }));
                    setPayments(mapped);
                }
            } catch (error) { console.error("UI Fetch Error:", error); }
            finally { setLoading(false); }
        };
        fetchLivePayments();
    }, []);

    const handleArchive = async (e: React.MouseEvent, refNo: string, uuid: string) => {
        e.stopPropagation();
        if (confirm(`Archive Reference No. "${refNo}"?`)) {
            try {
                await requestService.deleteRequest(uuid);
                setPayments(prev => prev.filter(p => p.id !== uuid));
            } catch (error) { alert("Delete failed."); }
        }
    };

    const filteredPayments = payments.filter(p =>
        p.controlNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.declarant_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="pp-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', color: '#29237a', margin: 0, fontWeight: 800 }}>Pending Payments Queue</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Live monitor of encoded requests</p>
                </div>
                <div style={{ display: 'flex', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '320px', alignItems: 'center', gap: '8px' }}>
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Search Reference No., Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                    />
                </div>
            </div>

            <div className="pp-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <tr>
                            {['Reference Number', 'Declarant Name', 'Document Type', 'Amount Due', 'Date Requested', 'Action'].map(h =>
                                <th key={h} style={{ padding: '14px 20px', color: '#475569', fontSize: '0.82rem', textTransform: 'uppercase' }}>{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr> :
                            filteredPayments.map((payment) => (
                                <tr key={payment.id} onClick={() => onSelectPayment(payment as any)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                    <td style={{ padding: '16px 20px', fontWeight: 700, color: '#29237a', fontFamily: 'monospace' }}>{payment.controlNumber}</td>
                                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{payment.declarant_name}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                                            {payment.documentType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: 800, color: '#059669' }}>₱{Number(payment.amountDue).toFixed(2)}</td>
                                    <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>{payment.dateRequested}</td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <button onClick={(e) => handleArchive(e, payment.controlNumber, payment.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}>
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