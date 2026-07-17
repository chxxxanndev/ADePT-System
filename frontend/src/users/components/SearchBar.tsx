const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="tr-search">
            <SearchIcon />
            <input
                type="text"
                placeholder="Search by Reference No., Declarant, Requested By, or Tax Dec. No..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
