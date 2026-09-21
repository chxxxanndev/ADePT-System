export interface LandholdingPropertyRow {
    id: string;                  // client-side uuid for React key
    tdArpNumber: string;         // TD/ARP No. e.g. "03-0004-00053"
    locationOfProperty: string;  // e.g. "Banganon, Gutalac, ZN"
    lotNumber: string;           // e.g. "62-C"
    titleNumber: string;         // e.g. "T-798"
    area: string;                // e.g. "1.9999 has."
    assessedValue: string;       // e.g. "34050.00"
}

export type OwnershipType =
    | 'single'     
    | 'multiple';  

export interface LandholdingFormData {
    declarantName: string;       
    ownershipType: OwnershipType;

    propertyRows: LandholdingPropertyRow[];

    dateGiven: string;           
    givenAt: string;             
    purpose: string;             

    primarySignatoryName: string;   
    primarySignatoryTitle: string;  

    secondarySignatoryName: string;  
    secondarySignatoryTitle: string; 

    certificationFee: string;    
    orNumber: string;            
    dated: string;             
    signatoryTopSpacing: number;
    signatoryGapSpacing: number;
}

export const EMPTY_LANDHOLDING_ROW = (): LandholdingPropertyRow => ({
    id: crypto.randomUUID(),
    tdArpNumber: '',
    locationOfProperty: '',
    lotNumber: '',
    titleNumber: '',
    area: '',
    assessedValue: '',
});

export const EMPTY_LANDHOLDING_FORM = (): LandholdingFormData => ({
    declarantName: '',
    ownershipType: 'single',
    propertyRows: [EMPTY_LANDHOLDING_ROW()],
    dateGiven: new Date().toISOString().split('T')[0],
    givenAt: 'Dipolog City',
    purpose: 'for whatever legal purpose/intent it may serve best',
    primarySignatoryName: 'ELVIRA T. ENAO, REA',
    primarySignatoryTitle: 'Local Assessment Operations Officer IV',
    secondarySignatoryName: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    secondarySignatoryTitle: 'Assistant Provincial Assessor',
    certificationFee: '40.00',
    orNumber: '',
    dated: new Date().toISOString().split('T')[0],
    signatoryTopSpacing: 60,
    signatoryGapSpacing: 65,
});
