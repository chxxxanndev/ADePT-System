interface TransactionTabsProps {
    active: 'registry' | 'reprint' | 'voidAmend';
    onNavigateToRegistry: () => void;
    onNavigateToReprint: () => void;
    onNavigateToVoidAmend: () => void;
}

export function TransactionTabs({
    active,
    onNavigateToRegistry,
    onNavigateToReprint,
    onNavigateToVoidAmend,
}: TransactionTabsProps) {
    return (
        <div className="tr-tabs" role="tablist" aria-label="Transaction sections">
            <button
                type="button"
                className={`tr-tab ${active === 'registry' ? 'tr-tab--active' : ''}`}
                aria-current={active === 'registry' ? 'page' : undefined}
                onClick={active === 'registry' ? undefined : onNavigateToRegistry}
            >
                Transaction Registry
            </button>
            <button
                type="button"
                className={`tr-tab ${active === 'reprint' ? 'tr-tab--active' : ''}`}
                aria-current={active === 'reprint' ? 'page' : undefined}
                onClick={active === 'reprint' ? undefined : onNavigateToReprint}
            >
                Reprint/CTC
            </button>
            <button
                type="button"
                className={`tr-tab ${active === 'voidAmend' ? 'tr-tab--active' : ''}`}
                aria-current={active === 'voidAmend' ? 'page' : undefined}
                onClick={active === 'voidAmend' ? undefined : onNavigateToVoidAmend}
            >
                Void &amp; Amend
            </button>
            {/* Archive Management pill intentionally left out per Peter's instruction */}
        </div>
    );
}