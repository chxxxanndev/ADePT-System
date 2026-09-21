export type PronounType = 'His' | 'Her' | 'Their';

export type PropertyCountType = 'singular' | 'plural';

export interface NoLandholdingFormData {
    declarantName: string;       
    pronoun: PronounType;        
    propertyCount: PropertyCountType;

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
}

export const EMPTY_NO_LANDHOLDING_FORM = (): NoLandholdingFormData => ({
    declarantName: '',
    pronoun: 'His',
    propertyCount: 'singular',
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
});