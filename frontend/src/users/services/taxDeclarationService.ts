import type { TaxDeclarationFormData } from '../types/taxDeclaration';
import { requestService, api } from './requestService';
import axios from 'axios';

export const taxDeclarationService = {
    save: async (
        formData: TaxDeclarationFormData,
        requestId: string,
        staffAuthId: string,
    ) => {
        const payload = {
            staffAuthId,
            requestId,
            taxDeclarationNumber: formData.taxDeclarationNumber,
            propertyIndexNumber: formData.propertyIndexNumber,
            arpNumber: formData.arpNumber,
            effectivityYear: Number(formData.effectivityYear) || null,
            ownerName: formData.ownerName,
            ownerAddress: formData.ownerAddress,
            ownerTin: formData.ownerTin,
            ownerTelephone: formData.ownerTelephone,
            administratorName: formData.administratorName,
            administratorAddress: formData.administratorAddress,
            administratorTin: formData.administratorTin,
            administratorTelephone: formData.administratorTelephone,
            propertyStreet: formData.propertyStreet,
            barangay: formData.barangay || formData.barangayId,
            municipality: formData.municipality || formData.municipalityId,
            octTctNumber: formData.octTctNumber,
            surveyNumber: formData.surveyNumber,
            lotNumber: formData.lotNumber,
            blockNumber: formData.blockNumber,
            boundaryNorth: formData.boundaryNorth,
            boundarySouth: formData.boundarySouth,
            boundaryEast: formData.boundaryEast,
            boundaryWest: formData.boundaryWest,
            totalMarketValue: formData.totalMarketValue,
            totalAssessedValue: formData.totalAssessedValue,
            amountInWords: formData.amountInWords,
            taxability: formData.taxability,
            cancelledTdNumber: formData.arpNumber,
            assessorName: formData.assessorName,
            assessorTitle: formData.assessorTitle,
            memoranda: formData.memoranda,
            notes: formData.notes,
            assessmentRows: formData.assessmentRows.map((row, idx) => ({
                rowOrder: idx,
                kindOfProperty: row.kindOfProperty || null,
                classificationId: row.classificationId || null,
                classificationLabel: (row as any).classificationLabel || null,
                actualUseId: row.actualUseId || null,
                actualUseOtherText: row.actualUseOtherText || null,
                area: row.area != null && String(row.area).trim() !== ''
                    ? String(row.area).replace(/,/g, '')
                    : null,
                areaUnit: row.areaUnit,
                marketValue: row.marketValue ? Number(row.marketValue) : null,
                assessmentLevel: row.assessmentLevel ? Number(row.assessmentLevel) : null,
                assessedValue: row.assessedValue ? Number(row.assessedValue) : null,
            })),
        };

        try {
            const res = await api.post('/tax-declarations', payload);
            return res.data;
        } catch (err: any) {
            if (!err.response) {
                console.warn('[taxDeclarationService] Server unreachable — using local mock.');
                return {
                    message: 'Tax Declaration saved (mock).',
                    data: { id: crypto.randomUUID(), ...payload },
                };
            }
            throw err;
        }
    },

    getTaxDeclaration: async (requestId: string) => {
        try {
            const meta = await requestService.getMetadata();
            
            let dbData;
            try {
                const res = await api.get(`/tax-declarations/${requestId}`);
                dbData = res.data.data;
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    return null;
                }
                throw error;
            }

            if (!dbData) return null;

            const classificationMap: Record<string, string> = {};
            (meta?.classifications || []).forEach((c: any) => {
                classificationMap[c.code] = c.label;
                classificationMap[c.id] = c.label;
            });

            const propertyTypeMap: Record<string, string> = {};
            (meta?.propertyTypes || []).forEach((p: any) => {
                propertyTypeMap[p.code] = p.label;
                propertyTypeMap[p.id] = p.label;
            });

            const assessmentRows = (dbData.assessments || dbData.encoded_assessment_rows || []).map((row: any) => {
                const rawClassification = (row.classification_id || '').trim();
                const normalizedKey = rawClassification.toUpperCase();
                return {
                    classificationLabel: classificationMap[normalizedKey] || rawClassification || '',
                    kindOfProperty: propertyTypeMap[row.kind_of_property] || row.kind_of_property || '',
                    area: row.area,
                    areaUnit: row.area_unit,
                    marketValue: row.market_value,
                    assessmentLevel: row.assessment_level,
                    assessedValue: row.assessed_value,
                };
            });

            const totalArea = assessmentRows.reduce(
                (sum: number, r: any) => sum + (parseFloat(String(r.area || '').replace(/,/g, '')) || 0),
                0
            );

            const distinctUnits = [
                ...new Set(
                    assessmentRows
                        .map((r: any) => (r.areaUnit || '').trim())
                        .filter(Boolean)
                ),
            ];

const areaUnitSuffix = (distinctUnits[0] as string) || '';
const displayUnitSuffix = /sq/i.test(areaUnitSuffix) ? 'sqm.' : areaUnitSuffix ? 'has.' : '';

            const formattedArea = totalArea > 0
                ? totalArea.toLocaleString(undefined, {
                      minimumFractionDigits: /sq/i.test(areaUnitSuffix) ? 2 : 0,
                      maximumFractionDigits: 10,
                  })
                : '';

            return {
                id: dbData.id,
                request: dbData.request,
                taxDeclarationNumber: dbData.tax_declaration_number,
                propertyIndexNumber: dbData.property_identification_number,
                arpNumber: dbData.arp_number,
                ownerName: dbData.owner_name,
                ownerAddress: dbData.owner_address,
                administratorName: dbData.administrator_name,
                administratorAddress: dbData.administrator_address,
                barangay: dbData.barangay?.name || '',
                municipality: dbData.municipality?.name || '',
                octTctNumber: dbData.oct_tct_cloa_number,
                surveyNumber: dbData.survey_number,
                lotNumber: dbData.lot_number,
                blkNumber: dbData.block_number,
                boundaryNorth: dbData.boundary_north,
                boundarySouth: dbData.boundary_south,
                boundaryEast: dbData.boundary_east,
                boundaryWest: dbData.boundary_west,
                totalMarketValue: dbData.total_market_value,
                totalAssessedValue: dbData.total_assessed_value,
                totalAssessedValueWords: dbData.amount_in_words,
                taxable: dbData.taxability === 'TAXABLE',
                taxability: dbData.taxability || 'TAXABLE',
                taxEffectivity: dbData.effectivity_year,
                cancelsArpNo: dbData.cancelled_td_number,
                assessorName: dbData.assessor_name,
                assessorTitle: dbData.assessor_title,
                memoranda: dbData.memoranda,
                area: formattedArea
                    ? `${formattedArea}${displayUnitSuffix ? ' ' + displayUnitSuffix : ''}`
                    : '',
                assessmentRows,
                assessments: assessmentRows,
            };
        } catch (error) {
            console.error("[taxDeclarationService] Error fetching details:", error);
            throw error;
        }
    },

    updateDraft: async (id: string, updateData: any) => {
        const res = await api.put(`/tax-declarations/${id}/edit-draft`, updateData);
        return res.data;
    },

    getRawForEdit: async (requestId: string) => {
        try {
            const res = await api.get(`/tax-declarations/${requestId}`);
            return res.data?.data ?? null;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },
};