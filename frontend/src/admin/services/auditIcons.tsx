import type { ReactNode } from 'react';
import {
    LogIn,
    LogOut,
    UploadCloud,
    Printer,
    Clock,
    FileX,
    Archive,
    Send,
    Forward,
    CheckCircle2,
    XCircle,
    UserCheck,
    UserX,
    ArrowUpCircle,
    ArrowDownCircle,
    Settings2,
} from 'lucide-react';
import type { AuditActionType } from './auditLogService';
import '../styles/AdminAuditLog.css';

// Shared icon + color styling for audit activity. Used by both the Admin
// Audit Log page (Staff/Admin Activity Log) and the dashboard's Recent
// Activity card, so both always render identically.
export const AUDIT_ICON_MAP: Record<AuditActionType, ReactNode> = {
    login: <LogIn size={16} />,
    logout: <LogOut size={16} />,
    document_upload: <UploadCloud size={16} />,
    report_print: <Printer size={16} />,
    document_pending: <Clock size={16} />,
    document_voided: <FileX size={16} />,
    document_archived: <Archive size={16} />,
    document_released: <Send size={16} />,
    document_forwarded: <Forward size={16} />,
    document_reprinted: <Printer size={16} />,
    approval: <CheckCircle2 size={16} />,
    decline: <XCircle size={16} />,
    account_activate: <UserCheck size={16} />,
    account_deactivate: <UserX size={16} />,
    staff_promote: <ArrowUpCircle size={16} />,
    staff_demote: <ArrowDownCircle size={16} />,
    system: <Settings2 size={16} />,
};

export const AUDIT_ICON_CLASS_MAP: Record<AuditActionType, string> = {
    login: "audit-icon--login",
    logout: "audit-icon--logout",
    document_upload: "audit-icon--document-upload",
    report_print: "audit-icon--report-print",
    document_pending: "audit-icon--document-pending",
    document_voided: "audit-icon--document-voided",
    document_archived: "audit-icon--document-archived",
    document_released: "audit-icon--document-released",
    document_forwarded: "audit-icon--document-forwarded",
    document_reprinted: "audit-icon--document-reprinted",
    approval: "audit-icon--approval",
    decline: "audit-icon--decline",
    account_activate: "audit-icon--account-activate",
    account_deactivate: "audit-icon--account-deactivate",
    staff_promote: "audit-icon--staff-promote",
    staff_demote: "audit-icon--staff-demote",
    system: "audit-icon--system",
};

export function AuditTypeIcon({ type }: { type: AuditActionType }) {
    return (
        <div className={`audit-icon ${AUDIT_ICON_CLASS_MAP[type]}`}>
            {AUDIT_ICON_MAP[type]}
        </div>
    );
}
