import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * Expected `data` shape (fill in from your request/tax-dec records):
 * {
 *   taxDeclarationNumber, propertyIndexNumber,
 *   ownerName, ownerAddress, administratorName, administratorAddress,
 *   barangay, municipality,
 *   octTctNumber, surveyNumber, lotNumber, blkNumber,
 *   boundaryNorth, boundarySouth, boundaryEast, boundaryWest,
 *   assessmentRows: [{ kindOfProperty, classificationLabel, marketValue, assessmentLevel, assessedValue }],
 *   totalAssessedValueWords, area, taxEffectivity, taxable: boolean,
 *   cancelsArpNo, memoranda,
 * }
 * `orNumber`, `datePaid`, and `signatory` (Municipal Assessor name) stay as separate props.
 */

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Times-Roman',
    position: 'relative',
    fontSize: 9,
    lineHeight: 1.15,
  },

  // LAYER 1: BACKGROUND (seals + capitol watermark, full page edge-to-edge)
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    zIndex: -1,
  },

  formNoTag: {
    position: 'absolute',
    top: 26,
    left: 36,
    fontSize: 8,
    fontFamily: 'Times-Roman',
  },

  content: {
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 24,
  },

  headerCenter: {
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSmall: {
    fontSize: 8.5,
  },
  headerBold: {
    fontSize: 10,
    fontFamily: 'Times-Bold',
    marginTop: 1,
  },
  headerAddress: {
    fontSize: 8,
    marginTop: 1,
  },

  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8.5,
    marginBottom: 10,
  },
  refFieldLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1.1,
  },
  refFieldRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  refUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    marginLeft: 3,
    minHeight: 11,
    paddingLeft: 3,
  },
  refValue: {
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
  },

  title: {
    fontSize: 14,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.4,
  },

  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  fieldLabelOwner: {
    fontSize: 8.5,
    width: 48,
  },
  fieldLabelAdmin: {
    fontSize: 8.5,
    width: 76,
  },
  fieldUnderlineLeft: {
    flex: 1.4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    minHeight: 11,
    paddingLeft: 3,
  },
  fieldUnderlineRight: {
    flex: 1.3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    minHeight: 11,
    paddingLeft: 3,
  },
  fieldValueBold: {
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
  },
  fieldValueRegular: {
    fontSize: 8.5,
  },
  addressLabel: {
    fontSize: 8.5,
    width: 48,
    marginLeft: 10,
  },

  locationRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  locationLabelBlock: {
    width: 76,
    fontSize: 8.5,
    lineHeight: 1.1,
  },
  locationContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  locationCell: {
    flex: 1,
    alignItems: 'center',
  },
  locationUnderline: {
    width: '100%',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    minHeight: 11,
    textAlign: 'center',
    fontSize: 8.5,
  },
  locationSubLabel: {
    fontSize: 7.5,
    marginTop: 1,
    textAlign: 'center',
  },

  landRefRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 6,
    fontSize: 8.5,
    gap: 6,
    alignItems: 'flex-end',
  },
  landRefField: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-end',
  },
  landRefLabel: {
    fontSize: 8.5,
  },
  landRefUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    marginLeft: 2,
    minHeight: 11,
    paddingLeft: 2,
  },

  boundaryRow: {
    flexDirection: 'row',
    marginBottom: 3,
    gap: 12,
  },
  boundaryFieldLeft: {
    flexDirection: 'row',
    flex: 1.1,
    alignItems: 'flex-end',
  },
  boundaryFieldRight: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-end',
  },
  boundaryLabelFirst: {
    fontSize: 8.5,
    width: 95,
  },
  boundaryLabelEast: {
    fontSize: 8.5,
    width: 95,
    textAlign: 'right',
    paddingRight: 4,
  },
  boundaryLabelRight: {
    fontSize: 8.5,
    width: 36,
  },
  boundaryUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    minHeight: 11,
    paddingLeft: 3,
  },

  noteText: {
    fontSize: 7.5,
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
  },

  // Valuation Table Section
  valuationContainer: {
    marginTop: 4,
    marginBottom: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#000',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 3,
    alignItems: 'flex-end',
  },
  thCell1: { width: '20%', textAlign: 'center', fontSize: 8, fontFamily: 'Times-Roman' },
  thCell2: { width: '20%', textAlign: 'center', fontSize: 8, fontFamily: 'Times-Roman' },
  thCell3: { width: '22%', textAlign: 'center', fontSize: 8, fontFamily: 'Times-Roman' },
  thCell4: { width: '18%', textAlign: 'center', fontSize: 8, fontFamily: 'Times-Roman' },
  thCell5: { width: '20%', textAlign: 'center', fontSize: 8, fontFamily: 'Times-Roman' },

  tableDataRow: {
    flexDirection: 'row',
    marginTop: 3,
    alignItems: 'flex-end',
  },
  tdCell1: { width: '20%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, paddingLeft: 2, fontSize: 8 },
  tdCell2: { width: '20%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, paddingLeft: 2, fontSize: 8 },
  tdCell3: { width: '22%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, paddingLeft: 2, fontSize: 8 },
  tdCell4: { width: '18%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, textAlign: 'center', fontSize: 8 },
  tdCell5: { width: '20%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, paddingLeft: 2, fontSize: 8 },

  tableTotalRow: {
    flexDirection: 'row',
    marginTop: 5,
    alignItems: 'flex-end',
  },
  totalCellBlank: { width: '40%' },
  totalCellMarket: { width: '22%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, fontSize: 8, fontFamily: 'Times-Bold' },
  totalCellMiddle: { width: '18%' },
  totalCellAssessed: { width: '20%', borderBottomWidth: 0.5, borderBottomColor: '#000', minHeight: 11, fontSize: 8, fontFamily: 'Times-Bold' },

  // Total Assessed Value
  totalAssessedRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalAssessedLabel: {
    fontSize: 8.5,
    width: 95,
  },
  totalAssessedUnderline: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    minHeight: 11,
    paddingLeft: 3,
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
  },
  amountInWordsSub: {
    fontSize: 7.5,
    textAlign: 'center',
    marginTop: 1,
    marginBottom: 6,
  },

  areaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  areaField: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '46%',
  },
  areaLabel: {
    fontSize: 8.5,
  },
  areaUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    marginLeft: 3,
    minHeight: 11,
    paddingLeft: 3,
  },

  taxableRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
    gap: 20,
  },
  checkboxText: {
    fontSize: 8.5,
  },

  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  verifiedLabel: {
    fontSize: 8.5,
  },
  assessorBlock: {
    width: 200,
    alignItems: 'center',
  },
  assessorUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    width: '100%',
    minHeight: 11,
    textAlign: 'center',
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
  },
  assessorCaption: {
    fontSize: 8,
    marginTop: 1,
  },

  cancelsRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'flex-end',
  },
  cancelsLabel: {
    fontSize: 8.5,
  },
  cancelsUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    marginLeft: 3,
    minHeight: 11,
    paddingLeft: 3,
  },

  memorandaRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  memorandaLabel: {
    fontSize: 8.5,
  },
  memorandaUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    flex: 1,
    marginLeft: 3,
    minHeight: 11,
    paddingLeft: 3,
  },

  // Certified Box
  certifiedContainer: {
    borderWidth: 0.5,
    borderColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  certifiedLeft: {
    width: '55%',
  },
  certifiedLeftTitle: {
    fontSize: 8.5,
    marginBottom: 14,
  },
  signatoryLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    width: 180,
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 8,
    fontFamily: 'Times-Bold',
    minHeight: 10,
  },
  signatorySubText: {
    fontSize: 7.5,
    textAlign: 'center',
    marginTop: 1,
  },
  certifiedRight: {
    width: '40%',
    fontSize: 8,
    justifyContent: 'flex-end',
  },
  feeText: {
    fontSize: 8,
  },
  feeBold: {
    fontFamily: 'Times-Bold',
    textDecoration: 'underline',
  },

  importantNote: {
    fontSize: 7,
    marginTop: 4,
    textAlign: 'justify',
    lineHeight: 1.25,
  },
});

const peso = (n: any) => (n || n === 0 ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const TaxDeclarationPDF = ({ data = {}, orNumber = '', datePaid = '', signatory = '' }: any) => {
  const rows = data.assessmentRows || [];
  const totalMarketValue = rows.reduce((sum: number, r: any) => sum + (Number(r.marketValue) || 0), 0);
  const totalAssessedValue = rows.reduce((sum: number, r: any) => sum + (Number(r.assessedValue) || 0), 0);

  // Fill up to at least 1 default row if empty
  const displayRows = rows.length > 0 ? rows : [{ kindOfProperty: 'LAND', classificationLabel: '', marketValue: '', assessmentLevel: '', assessedValue: '' }];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* LAYERED BACKGROUND (seals + capitol watermark) */}
        <Image fixed src={window.location.origin + '/images/official_bg.png'} style={styles.background} />

        <Text style={styles.formNoTag}>RPA FORM NO. 1A</Text>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerCenter}>
            <Text style={styles.headerSmall}>Republic of the Philippines</Text>
            <Text style={styles.headerBold}>PROVINCE OF ZAMBOANGA DEL NORTE</Text>
            <Text style={styles.headerBold}>OFFICE OF THE PROVINCIAL ASSESSOR</Text>
            <Text style={styles.headerAddress}>Capitol Building, Dipolog City, Philippines</Text>
          </View>

          {/* Reference numbers */}
          <View style={styles.refRow}>
            <View style={styles.refFieldLeft}>
              <Text>Assessment of Real Property No.:</Text>
              <View style={styles.refUnderline}>
                <Text style={styles.refValue}>{data.taxDeclarationNumber || ''}</Text>
              </View>
            </View>
            <View style={styles.refFieldRight}>
              <Text>Property Index No.:</Text>
              <View style={styles.refUnderline}>
                <Text style={styles.refValue}>{data.propertyIndexNumber || ''}</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>DECLARATION OF REAL PROPERTY</Text>

          {/* Owner & Administrator */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabelOwner}>Owner:</Text>
            <View style={styles.fieldUnderlineLeft}>
              <Text style={styles.fieldValueBold}>{String(data.ownerName || '').toUpperCase()}</Text>
            </View>
            <Text style={styles.addressLabel}>Address:</Text>
            <View style={styles.fieldUnderlineRight}>
              <Text style={styles.fieldValueRegular}>{String(data.ownerAddress || '').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabelAdmin}>Administrator:</Text>
            <View style={styles.fieldUnderlineLeft}>
              <Text style={styles.fieldValueBold}>{String(data.administratorName || '').toUpperCase()}</Text>
            </View>
            <Text style={styles.addressLabel}>Address:</Text>
            <View style={styles.fieldUnderlineRight}>
              <Text style={styles.fieldValueRegular}>{String(data.administratorAddress || '').toUpperCase()}</Text>
            </View>
          </View>

          {/* Location of Property */}
          <View style={styles.locationRow}>
            <View style={styles.locationLabelBlock}>
              <Text>Location of</Text>
              <Text>Property</Text>
            </View>
            <View style={styles.locationContainer}>
              <View style={styles.locationCell}>
                <Text style={styles.locationUnderline}>{data.barangay || ''}</Text>
                <Text style={styles.locationSubLabel}>(Barangay)</Text>
              </View>
              <View style={styles.locationCell}>
                <Text style={styles.locationUnderline}>{data.municipality || ''}</Text>
                <Text style={styles.locationSubLabel}>(Municipality)</Text>
              </View>
              <View style={styles.locationCell}>
                <Text style={[styles.locationUnderline, { fontFamily: 'Times-Bold' }]}>ZAMBOANGA DEL NORTE</Text>
                <Text style={styles.locationSubLabel}>(Province)</Text>
              </View>
            </View>
          </View>

          {/* Land reference */}
          <View style={styles.landRefRow}>
            <View style={styles.landRefField}>
              <Text style={styles.landRefLabel}>OCT/TCT No.</Text>
              <View style={styles.landRefUnderline}><Text>{data.octTctNumber || ''}</Text></View>
            </View>
            <View style={styles.landRefField}>
              <Text style={styles.landRefLabel}>Survey No.:</Text>
              <View style={styles.landRefUnderline}><Text>{data.surveyNumber || ''}</Text></View>
            </View>
            <View style={styles.landRefField}>
              <Text style={styles.landRefLabel}>Lot No.:</Text>
              <View style={styles.landRefUnderline}><Text>{data.lotNumber || ''}</Text></View>
            </View>
            <View style={styles.landRefField}>
              <Text style={styles.landRefLabel}>Blk. No.:</Text>
              <View style={styles.landRefUnderline}><Text>{data.blkNumber || ''}</Text></View>
            </View>
          </View>

          {/* Boundaries */}
          <View style={styles.boundaryRow}>
            <View style={styles.boundaryFieldLeft}>
              <Text style={styles.boundaryLabelFirst}>Boundaries: North:</Text>
              <View style={styles.boundaryUnderline}><Text>{data.boundaryNorth || ''}</Text></View>
            </View>
            <View style={styles.boundaryFieldRight}>
              <Text style={styles.boundaryLabelRight}>South:</Text>
              <View style={styles.boundaryUnderline}><Text>{data.boundarySouth || ''}</Text></View>
            </View>
          </View>
          <View style={styles.boundaryRow}>
            <View style={styles.boundaryFieldLeft}>
              <Text style={styles.boundaryLabelEast}>East:</Text>
              <View style={styles.boundaryUnderline}><Text>{data.boundaryEast || ''}</Text></View>
            </View>
            <View style={styles.boundaryFieldRight}>
              <Text style={styles.boundaryLabelRight}>West:</Text>
              <View style={styles.boundaryUnderline}><Text>{data.boundaryWest || ''}</Text></View>
            </View>
          </View>

          <Text style={styles.noteText}>
            (State streets, streams or PIN by bounded, or names of owner of adjoining lands)
          </Text>

          {/* Valuation Section */}
          <View style={styles.valuationContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.thCell1}>Kind of Property</Text>
              <Text style={styles.thCell2}>Classification</Text>
              <Text style={styles.thCell3}>Market Value</Text>
              <View style={styles.thCell4}>
                <Text style={{ textAlign: 'center' }}>Assessment</Text>
                <Text style={{ textAlign: 'center' }}>Level (%)</Text>
              </View>
              <Text style={styles.thCell5}>Assessed Value</Text>
            </View>

            {displayRows.map((row: any, i: number) => (
              <View key={i} style={styles.tableDataRow}>
                <Text style={styles.tdCell1}>{row.kindOfProperty || 'LAND'}</Text>
                <Text style={styles.tdCell2}>{row.classificationLabel || ''}</Text>
                <Text style={styles.tdCell3}>
                  {row.marketValue ? `P  ${peso(row.marketValue)}` : (i === 0 ? 'P' : '')}
                </Text>
                <Text style={styles.tdCell4}>
                  {row.assessmentLevel ? `${row.assessmentLevel} %` : ''}
                </Text>
                <Text style={styles.tdCell5}>
                  {row.assessedValue ? `P  ${peso(row.assessedValue)}` : (i === 0 ? 'P' : '')}
                </Text>
              </View>
            ))}

            <View style={styles.tableTotalRow}>
              <View style={styles.totalCellBlank} />
              <Text style={styles.totalCellMarket}>
                {`TOTAL P  ${peso(totalMarketValue)}`}
              </Text>
              <View style={styles.totalCellMiddle} />
              <Text style={styles.totalCellAssessed}>
                {`TOTAL P  ${peso(totalAssessedValue)}`}
              </Text>
            </View>
          </View>

          {/* Total Assessed Value */}
          <View style={styles.totalAssessedRow}>
            <Text style={styles.totalAssessedLabel}>Total Assessed Value</Text>
            <View style={styles.totalAssessedUnderline}>
              <Text>{String(data.totalAssessedValueWords || '').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.amountInWordsSub}>(Amount in Words)</Text>

          {/* Area & Tax Effectivity */}
          <View style={styles.areaRow}>
            <View style={styles.areaField}>
              <Text style={styles.areaLabel}>Area:</Text>
              <View style={styles.areaUnderline}><Text>{data.area || ''}</Text></View>
            </View>
            <View style={styles.areaField}>
              <Text style={styles.areaLabel}>Tax Effectivity:</Text>
              <View style={styles.areaUnderline}><Text>{data.taxEffectivity || ''}</Text></View>
            </View>
          </View>

          {/* Taxable / Exempt */}
          <View style={styles.taxableRow}>
            <Text style={styles.checkboxText}>Taxable  [  {data.taxable ? 'X' : ' '}  ]</Text>
            <Text style={styles.checkboxText}>Exempt  [  {data.taxable ? ' ' : 'X'}  ]</Text>
          </View>

          {/* Verified by */}
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedLabel}>Verified by:</Text>
            <View style={styles.assessorBlock}>
              <View style={styles.assessorUnderline}>
                <Text>{signatory ? String(signatory).toUpperCase() : ''}</Text>
              </View>
              <Text style={styles.assessorCaption}>Municipal Assessor</Text>
            </View>
          </View>

          {/* Cancels ARP No. & Memoranda */}
          <View style={styles.cancelsRow}>
            <Text style={styles.cancelsLabel}>This declaration cancels ARP No.</Text>
            <View style={styles.cancelsUnderline}><Text>{data.cancelsArpNo || ''}</Text></View>
          </View>

          <View style={styles.memorandaRow}>
            <Text style={styles.memorandaLabel}>Memoranda:</Text>
            <View style={styles.memorandaUnderline}><Text>{data.memoranda || ''}</Text></View>
          </View>

          {/* Certified Copy Box */}
          <View style={styles.certifiedContainer}>
            <View style={styles.certifiedLeft}>
              <Text style={styles.certifiedLeftTitle}>Certified copy:</Text>
              <View style={styles.signatoryLine}>
                <Text> </Text>
              </View>
              <Text style={styles.signatorySubText}>Authorized Signatory</Text>
            </View>
            <View style={styles.certifiedRight}>
              <Text style={styles.feeText}>
                Certification Fee: <Text style={styles.feeBold}>Php. 40.00</Text>
              </Text>
              <Text style={{ marginTop: 2 }}>O.R. No.: {orNumber || ''}</Text>
              <Text style={{ marginTop: 2 }}>
                Date paid: {datePaid || ''}
              </Text>
            </View>
          </View>

          {/* Important note */}
          <Text style={styles.importantNote}>
            IMPORTANT: This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should not be considered as title to the property.
          </Text>
        </View>
      </Page>
    </Document>
  );
};