// FIX: Added 'type' keyword to satisfy verbatimModuleSyntax
import type { NavSection } from '../types/dashboard';

export const navSections: NavSection[] = [
    {
        label: 'GENERAL',
        items: [
            { label: 'Dashboard', icon: 'dashboard', view: 'dashboard' },
        ],
    },
    {
        label: 'REQUESTS',
        items: [
            {
                label: 'Request Processing',
                icon: 'requestProcessing',
                subItems: [
                    { label: 'Tax Declaration', view: 'tax-dec' },
                    { label: 'Land Holding', view: 'land-holding' },
                    { label: 'No Land Holding', view: 'no-land-holding' },
                ],
            },
        ],
    },
    {
        label: 'PROCESSING',
        items: [
            {
                label: 'Payment and Verification',
                icon: 'documentProcessing',
                subItems: [
                    { label: 'Pending Payment', view: 'pending-payment' },
                    { label: 'Pending Verification', view: 'pending-verification' },
                    { label: 'OR Validation', view: 'or-validation' },
                ],
            },
        ],
    },
];