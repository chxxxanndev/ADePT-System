import { useState, useEffect } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { pendingPaymentData } from '../data/PendingPaymentData';
import { requestService } from '../services/requestService';
import '../styles/PendingPayment.css';

const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ArchiveIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;

interface PendingPaymentProps { onSelectPayment: (payment: PendingPaymentRequest) => void; }

function resolveDocTypeName(req: any): string {
    if (req.documentType) return req.documentType;
    const idStr = Array.isArray(req.documentTypeIds) ? req.documentTypeIds.join(' ').toLowerCase() : String(req.documentTypeIds || '').toLowerCase();
    const ref = (req.referenceNumber || req.id || '').toLowerCase();
    if (idStr.includes('dt3') || idStr.includes('landholding') || ref.includes('lh')) return 'Certificate of Landholding';
    if (idStr.includes('dt4') || idStr.includes('nolandholding') || ref.includes('nlh')) return 'Certificate of No Landholding';
    return 'Certified True Tax Declaration';
}

function calculateFee(docType: string, customAmount?: number): number {
    if (customAmount && customAmount > 0) return customAmount;
    if (docType.includes('Landholding') && !docType.includes('No')) return 120.00;
    if (docType.includes('No Landholding')) return 80.00;
    return 40.00;
}

export function PendingPayment({ onSelectPayment }: PendingPaymentProps) {
    const [payments, setPayments] = useState<PendingPaymentRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLivePayments = async () => {
            try {
                setLoading(true);
                // 1. Fetch live requests from database (if available)
                const rawRequests = await requestService.getRequests();
                let mappedRequests: PendingPaymentRequest[] = [];

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

                // 2. Fetch the newly created forms from the Local Cache (Frontend Prototype logic)
                const localQueue = JSON.parse(localStorage.getItem('adept_live_queue') || '[]');

                // 3. Merge them! (Cache on top)
                const combined = [...localQueue, ...mappedRequests];

                // Remove duplicates just in case
                const uniquePayments = Array.from(new Map(combined.map(item => [item.controlNumber, item])).values());
                setPayments(uniquePayments.length > 0 ? uniquePayments : pendingPaymentData);

            } catch (error) {
                // If backend fails completely, merge Cache with Mock Backup
                const localQueue = JSON.parse(localStorage.getItem('adept_live_queue') || '[]');
                setPayments([...localQueue, ...pendingPaymentData]);
            } finally {
                setLoading(false);
            }
        };

        fetchLivePayments();
    }, []);

    const getAgingStyle = (dateStr: string) => {
        if (!dateStr) return { bg: '#dcfce7', text: '#166534' };
        const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) return { bg: '#dcfce7', text: '#166534' };
        if (diffDays <= 2) return { bg: '#fef9c3', text: '#854d0e' };
        return { bg: '#fee2e2', text: '#b91c1c' };
    };

    const handleArchive = async (e: React.MouseEvent, controlNumber: string, reqId?: string) => {
        e.stopPropagation();
        if (confirm(`Move Control No. "${controlNumber}" to Archive?\nUse this if the client abandoned the request.`)) {
            try {
                if (reqId) await requestService.deleteRequest(reqId);

                // Remove from local cache so it doesn't come back on refresh!
                const localQueue = JSON.parse(localStorage.getItem('adept_live_queue') || '[]');
                const updatedLocal = localQueue.filter((p: any) => p.controlNumber !== controlNumber);
                localStorage.setItem('adept_live_queue', JSON.stringify(updatedLocal));

                setPayments(prev => prev.filter(p => p.controlNumber !== controlNumber));
            } catch (error) { alert("Could not remove record from server."); }
        }
    };

    const filteredPayments = payments.filter(p => p.controlNumber.toLowerCase().includes(searchQuery.toLowerCase()) || p.declarantName.toLowerCase().includes(searchQuery.toLowerCase()) || p.documentType.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="pp-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', color: '#29237a', margin: 0, fontWeight: 800 }}>Pending Payments Queue</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Live monitor of clients awaiting Treasurer payment release</p>
                </div>
                <div style={{ display: 'flex', background: '#fff', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '320px', alignItems: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <SearchIcon />
                    <input type="text" placeholder="Search Control No., Name, or Doc Type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem' }} />
                </div>
            </div>

            <div className="pp-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <tr>
                            {['Control Number', 'Declarant Name', 'Document Type', 'Amount Due', 'Date Requested', 'Action'].map(h => <th key={h} style={{ padding: '14px 20px', color: '#475569', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h === 'Action' ? 'center' : 'left' }}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>⏳ Fetching live encoded requests from server...</td></tr> :
                            filteredPayments.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}><div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>No Pending Payments Found</div><span style={{ fontSize: '0.88rem' }}>When encoders submit new forms, they will instantly appear here.</span></td></tr> :
                                filteredPayments.map((payment: any) => {
                                    const aging = getAgingStyle(payment.dateRequested);
                                    return (
                                        <tr key={payment.controlNumber} onClick={() => onSelectPayment(payment)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}>
                                            <td style={{ padding: '16px 20px', fontWeight: 700, color: '#29237a', fontFamily: 'monospace', fontSize: '0.95rem' }}>{payment.controlNumber}</td>
                                            <td style={{ padding: '16px 20px', color: '#1e293b', fontWeight: 600 }}>{payment.declarantName}</td>
                                            <td style={{ padding: '16px 20px', color: '#475569', fontSize: '0.88rem' }}><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{payment.documentType}</span></td>
                                            <td style={{ padding: '16px 20px', fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>₱{Number(payment.amountDue).toFixed(2)}</td>
                                            <td style={{ padding: '16px 20px' }}><span style={{ background: aging.bg, color: aging.text, padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>{payment.dateRequested}</span></td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center' }}><button onClick={(e) => handleArchive(e, payment.controlNumber, payment.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }} title="Archive abandoned request"><ArchiveIcon /> Archive</button></td>
                                        </tr>
                                    );
                                })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}