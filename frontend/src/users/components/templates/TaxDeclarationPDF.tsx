import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// 1. REGISTER THE CASTELLAR FONT
Font.register({
  family: 'Castellar',
  src: window.location.origin + '/fonts/castellar.ttf' 
});

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Times-Roman',
    position: 'relative',
    fontSize: 11, 
    lineHeight: 1.1,
  },
  background: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    objectFit: 'fill', zIndex: -1,
  },
  formNoTag: {
    position: 'absolute',
    top: 15, left: 36,
    fontSize: 8,
  },
  content: {
    paddingHorizontal: 40,
    paddingTop: 15, // Reduced from 20 to save space
    paddingBottom: 15, // Reduced from 20 to save space
  },
  headerCenter: { 
    textAlign: 'center', 
    marginBottom: 35, // Reduced from 40 to move ARP/PIN closer to logos
  },
  h8: { fontSize: 8 },
  h10: { fontSize: 10, fontFamily: 'Times-Bold' },
  h11: { fontSize: 11, fontFamily: 'Times-Bold' },
  h7: { fontSize: 7 },

  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // Reduced from 15
  },
  refItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  refUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    flex: 1, 
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 11,
    paddingBottom: 1,
  },

  title: {
    fontSize: 16,
    fontFamily: 'Castellar',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20, // Reduced from 30 to pull content up
  },

  fieldRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-end',
  },
  label11: { fontSize: 11 },

  underlineData: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingLeft: 4,
    fontSize: 11,
    fontFamily: 'Times-Bold',
    minHeight: 14,
  },

  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationColumn: {
    width: '32%',
    alignItems: 'center',
  },
  locationLine: {
    borderBottomWidth: 1,
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 11,
    minHeight: 15,
  },
  locationSubLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  descriptionText: {
    fontSize: 10,
    textAlign: 'left',
    marginTop: 5,
    marginBottom: 2,
  },
  doubleLine: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
    height: 3,
    width: '100%',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  thCell: { fontSize: 10, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    height: 16,
  },
  tdCell: {
    width: '19%',
    borderBottomWidth: 1,
    fontSize: 10,
    fontFamily: 'Times-Bold',
    paddingLeft: 2,
    flexDirection: 'row',
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Times-Bold',
    width: '40%',
    textAlign: 'right',
    paddingRight: 10,
    marginTop: 2,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  verifiedBlock: { width: '45%' },
  assessorBlock: { width: '45%', alignItems: 'center' },
  signatureUnderline: {
    borderBottomWidth: 1,
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 11,
    minHeight: 14,
    paddingBottom: 1,
  },
  signatureSubLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  memoContainer: {
    marginTop: 5,
    marginBottom: 5,
  },
  memoLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  memoLine: {
    borderBottomWidth: 1,
    width: '100%',
    height: 14,
  },
  certifiedBox: {
    borderWidth: 1,
    padding: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certRightRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  certValueUnderline: {
    borderBottomWidth: 1,
    flex: 1,
    fontFamily: 'Times-Bold',
    fontSize: 10,
    paddingLeft: 4,
  },
  importantText: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'justify',
  }
});

const peso = (n: any) => (n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const TaxDeclarationPDF = ({ data = {}, orNumber = '', datePaid = '', signatory = '' }: any) => {
  const rows = data.assessmentRows || [];
  const tableRows = [...rows, ...Array(Math.max(0, 4 - rows.length)).fill({})];
  
  const totalMarketValue = rows.reduce((sum: any, r: any) => sum + (Number(r.marketValue) || 0), 0);
  const totalAssessedValue = rows.reduce((sum: any, r: any) => sum + (Number(r.assessedValue) || 0), 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Image fixed src={window.location.origin + '/images/official_bg.png'} style={styles.background} />
        <Text style={styles.formNoTag}>RPA FORM NO. 1A</Text>

        <View style={styles.content}>
          <View style={styles.headerCenter}>
            <Text style={styles.h8}>Republic of the Philippines</Text>
            <Text style={styles.h10}>PROVINCE OF ZAMBOANGA DEL NORTE</Text>
            <Text style={styles.h11}>OFFICE OF THE PROVINCIAL ASSESSOR</Text>
            <Text style={styles.h7}>Capitol Building, Dipolog City, Philippines</Text>
          </View>

          <View style={styles.refRow}>
            <View style={[styles.refItem, { marginRight: 20 }]}>
              <Text style={styles.label11}>Assessment of Real Property No.: </Text>
              <View style={styles.refUnderline}><Text>{data.taxDeclarationNumber}</Text></View>
            </View>
            <View style={styles.refItem}>
              <Text style={styles.label11}>Property Index No.: </Text>
              <View style={styles.refUnderline}><Text>{data.propertyIndexNumber}</Text></View>
            </View>
          </View>

          <Text style={styles.title}>DECLARATION OF REAL PROPERTY</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.label11}>Owner: </Text>
            <View style={styles.underlineData}><Text>{String(data.ownerName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label11, { marginLeft: 15 }]}>Address: </Text>
            <View style={styles.underlineData}><Text>{String(data.ownerAddress || '').toUpperCase()}</Text></View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label11}>Administrator: </Text>
            <View style={styles.underlineData}><Text>{String(data.administratorName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label11, { marginLeft: 15 }]}>Address: </Text>
            <View style={styles.underlineData}><Text>{String(data.administratorAddress || '').toUpperCase()}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 8, alignItems: 'flex-start' }]}>
            <View style={{ width: 75 }}>
              <Text>Location of</Text>
              <Text>Property: </Text>
            </View>
            <View style={styles.locationContainer}>
              <View style={styles.locationColumn}>
                <Text style={styles.locationLine}>{data.barangay}</Text>
                <Text style={styles.locationSubLabel}>(Barangay)</Text>
              </View>
              <View style={styles.locationColumn}>
                <Text style={styles.locationLine}>{data.municipality}</Text>
                <Text style={styles.locationSubLabel}>(Municipality)</Text>
              </View>
              <View style={styles.locationColumn}>
                <Text style={[styles.locationLine, { fontFamily: 'Times-Bold' }]}>ZAMBOANGA DEL NORTE</Text>
                <Text style={styles.locationSubLabel}>(Province)</Text>
              </View>
            </View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 8 }]}>
            <View style={[styles.gridItem, { flex: 1.2 }]}><Text>OCT/TCT No. </Text><View style={styles.underlineData}><Text>{data.octTctNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 1, marginLeft: 10 }]}><Text>Survey No.: </Text><View style={styles.underlineData}><Text>{data.surveyNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.8, marginLeft: 10 }]}><Text>Lot No.: </Text><View style={styles.underlineData}><Text>{data.lotNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.7, marginLeft: 10 }]}><Text>Blk. No.: </Text><View style={styles.underlineData}><Text>{data.blkNumber}</Text></View></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 8 }]}>
            <Text style={{ width: 110 }}>Boundaries: North: </Text>
            <View style={styles.underlineData}><Text>{data.boundaryNorth}</Text></View>
            <Text style={{ marginLeft: 15 }}>South: </Text>
            <View style={styles.underlineData}><Text>{data.boundarySouth}</Text></View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={{ width: 110, textAlign: 'right', paddingRight: 4 }}>East: </Text>
            <View style={styles.underlineData}><Text>{data.boundaryEast}</Text></View>
            <Text style={{ marginLeft: 15 }}>West: </Text>
            <View style={styles.underlineData}><Text>{data.boundaryWest}</Text></View>
          </View>

          <Text style={styles.descriptionText}>(State streets, streams or PIN by bounded, or names of owner of adjoining lands)</Text>
          <View style={styles.doubleLine} />

          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { width: '19%' }]}>Kind of Property</Text>
            <Text style={[styles.thCell, { width: '19%' }]}>Classification</Text>
            <Text style={[styles.thCell, { width: '19%' }]}>Market Value</Text>
            <View style={[styles.thCell, { width: '19%' }]}><Text>Assessment Level (%)</Text></View>
            <Text style={[styles.thCell, { width: '19%' }]}>Assessed Value</Text>
          </View>

          {tableRows.map((row: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.tdCell}><Text>{row.kindOfProperty || ' '}</Text></View>
              <View style={styles.tdCell}><Text>{row.classificationLabel || ' '}</Text></View>
              <View style={styles.tdCell}><Text style={{ marginRight: 4 }}>P</Text><Text>{peso(row.marketValue)}</Text></View>
              <View style={[styles.tdCell, { justifyContent: 'center' }]}><Text>{row.assessmentLevel ? `${row.assessmentLevel}%` : ''}</Text></View>
              <View style={styles.tdCell}><Text style={{ marginRight: 4 }}>P</Text><Text>{peso(row.assessedValue)}</Text></View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <View style={[styles.tdCell, { borderBottomWidth: 0 }]}><Text style={{ marginRight: 4 }}>P</Text><Text>{peso(totalMarketValue)}</Text></View>
            <View style={{ width: '19%' }} />
            <Text style={[styles.totalLabel, { width: 50, textAlign: 'left' }]}>TOTAL</Text>
            <View style={[styles.tdCell, { borderBottomWidth: 0 }]}><Text style={{ marginRight: 4 }}>P</Text><Text>{peso(totalAssessedValue)}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 8 }]}>
            <Text>Total Assessed Value: </Text>
            <View style={styles.underlineData}><Text>{String(data.totalAssessedValueWords || '').toUpperCase()}</Text></View>
          </View>
          <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 5 }}>(Amount in Words)</Text>

          <View style={styles.fieldRow}>
            <Text>Area: </Text>
            <View style={styles.underlineData}><Text>{data.area}</Text></View>
            <Text style={{ marginLeft: 15 }}>Tax Effectivity: </Text>
            <View style={styles.underlineData}><Text>{data.taxEffectivity}</Text></View>
          </View>

          <View style={[styles.fieldRow, { gap: 30 }]}>
            <Text>Taxable  [ {data.taxable ? 'X' : ' '} ]</Text>
            <Text>Exempt  [ {!data.taxable ? 'X' : ' '} ]</Text>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.verifiedBlock}>
              <Text style={{ marginBottom: 2 }}>Verified by:</Text>
              <View style={styles.signatureUnderline} />
            </View>
            <View style={styles.assessorBlock}>
              <Text>{signatory ? signatory.toUpperCase() : ' '}</Text>
              <View style={styles.signatureUnderline} />
              <Text style={styles.signatureSubLabel}>Municipal Assessor</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text>This declaration cancels ARP No. </Text>
            <View style={styles.underlineData}><Text>{data.cancelsArpNo}</Text></View>
          </View>

          <View style={styles.memoContainer}>
             <View style={styles.memoLabelRow}>
                <Text style={{ fontSize: 10 }}>Memoranda: </Text>
                <View style={[styles.memoLine, { flex: 1 }]}>
                   <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>{data.memoranda}</Text>
                </View>
             </View>
             <View style={styles.memoLine} />
             <View style={styles.memoLine} />
          </View>

          <View style={styles.certifiedBox}>
            <View style={{ width: '50%' }}>
              <Text style={{ marginBottom: 15 }}>Certified copy:</Text>
              <View style={{ borderTopWidth: 1, width: 200, textAlign: 'center' }}>
                <Text style={{ fontSize: 9, marginTop: 2 }}>Authorized Signatory</Text>
              </View>
            </View>
            
            <View style={{ width: '45%', gap: 2 }}>
              <View style={styles.certRightRow}>
                 <Text style={{ fontSize: 10 }}>Certification Fee: </Text>
                 <Text style={styles.certValueUnderline}>Php. 40.00</Text>
              </View>
              <View style={styles.certRightRow}>
                 <Text style={{ fontSize: 10 }}>O.R. No.: </Text>
                 <Text style={styles.certValueUnderline}>{orNumber}</Text>
              </View>
              <View style={styles.certRightRow}>
                 <Text style={{ fontSize: 10 }}>Date paid: </Text>
                 <Text style={styles.certValueUnderline}>{datePaid}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.importantText}>
            IMPORTANT: This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should not be considered as title to the property.
          </Text>
        </View>
      </Page>
    </Document>
  );
};