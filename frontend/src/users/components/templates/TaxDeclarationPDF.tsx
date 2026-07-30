import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// REGISTER THE CASTELLAR FONT
Font.register({
  family: 'Castellar',
  src: window.location.origin + '/fonts/castellar.ttf'
});

const styles = StyleSheet.create({
  page: { 
    padding: 0, 
    fontFamily: 'Times-Roman', 
    position: 'relative', 
    fontSize: 10, 
    lineHeight: 1.15 
  },
  background: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    width: '100%', 
    height: '100%', 
    objectFit: 'fill', 
    zIndex: -1 
  },
  formNoTag: { position: 'absolute', top: 15, left: 36, fontSize: 8 },
  content: { paddingHorizontal: 38, paddingTop: 15, paddingBottom: 15 },
  headerCenter: { textAlign: 'center', marginBottom: 30 },
  h8: { fontSize: 8 },
  h10: { fontSize: 10, fontFamily: 'Times-Bold' },
  h11: { fontSize: 11, fontFamily: 'Times-Bold' },
  h7: { fontSize: 7.5 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refItem: { flexDirection: 'row', alignItems: 'flex-end', flex: 1 },
  refUnderline: { borderBottomWidth: 1, borderBottomColor: '#000', flex: 1, textAlign: 'center', fontFamily: 'Times-Bold', fontSize: 10.5, height: 14, paddingBottom: 0 },
  title: { fontSize: 15, fontFamily: 'Castellar', textAlign: 'center', marginTop: 20, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  label10: { fontSize: 10 },
  underlineData: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    paddingLeft: 4, 
    fontSize: 10.5, 
    fontFamily: 'Times-Bold', 
    minHeight: 14, 
    justifyContent: 'flex-end' 
  },
  locationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  locationColumn: { width: '32%', alignItems: 'center' },
  locationLine: { borderBottomWidth: 1, width: '100%', textAlign: 'center', fontFamily: 'Times-Bold', fontSize: 10.5, minHeight: 14 },
  locationSubLabel: { fontSize: 9, marginTop: 2 },
  gridItem: { flexDirection: 'row', alignItems: 'flex-end' },
  descriptionText: { fontSize: 9, textAlign: 'left', marginTop: 3, marginBottom: 4 },
  doubleLine: { borderBottomWidth: 1, borderTopWidth: 1, height: 3, width: '100%', marginBottom: 6 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  thCell: { fontSize: 9.5, textAlign: 'center' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, height: 15 },
  tdCell: { width: '19%', borderBottomWidth: 1, fontSize: 10, fontFamily: 'Times-Bold', paddingLeft: 2, flexDirection: 'row', alignItems: 'flex-end' },
  totalLabel: { fontSize: 9.5, fontFamily: 'Times-Bold', width: '40%', textAlign: 'right', paddingRight: 10, marginTop: 2 },

  // Signature & Memo Styles
  signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 6 },
  verifiedBlock: { width: '45%' },
  assessorBlock: { width: '45%', alignItems: 'center' },
  signatureUnderline: { borderBottomWidth: 1, width: '100%', textAlign: 'center', fontFamily: 'Times-Bold', fontSize: 10, minHeight: 14 },
  signatureSubLabel: { fontSize: 9, marginTop: 2, textAlign: 'center' },
  memoContainer: { marginTop: 6, marginBottom: 6 },
  memoLabelRow: { flexDirection: 'row', alignItems: 'flex-end' },
  memoLine: { borderBottomWidth: 1, width: '100%', height: 14 },

  // Certified Box Styles
  certifiedBox: { borderWidth: 1, padding: 6, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  certLeftBlock: { width: '60%', flexDirection: 'row' },
  certSignatoryBlock: { flex: 1, alignItems: 'center', paddingRight: 10, paddingTop: 2 },
  certRightRow: { flexDirection: 'row', marginBottom: 2 },
  certValueUnderline: { borderBottomWidth: 1, flex: 1, fontFamily: 'Times-Bold', fontSize: 9.5, paddingLeft: 4, textAlign: 'center' },
  importantText: { fontSize: 8.5, marginTop: 5, textAlign: 'justify' }
});

const peso = (n: any) => (n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const TaxDeclarationPDF = ({
  data = {},
  orNumber = '',
  datePaid = '',
  certifiedByName = '',
  certifiedByTitle = ''
}: any) => {
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
            <View style={[styles.refItem, { marginRight: 15 }]}>
              <Text style={styles.label10}>Assessment of Real Property No.: </Text>
              <View style={styles.refUnderline}><Text>{data.taxDeclarationNumber}</Text></View>
            </View>
            <View style={styles.refItem}>
              <Text style={styles.label10}>Property Index No.: </Text>
              <View style={styles.refUnderline}><Text>{data.propertyIndexNumber}</Text></View>
            </View>
          </View>

          <Text style={styles.title}>DECLARATION OF REAL PROPERTY</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Owner: </Text>
            <View style={styles.underlineData}><Text>{String(data.ownerName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label10, { marginLeft: 10 }]}>Address: </Text>
            <View style={styles.underlineData}><Text>{String(data.ownerAddress || '').toUpperCase()}</Text></View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Administrator: </Text>
            <View style={styles.underlineData}><Text>{String(data.administratorName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label10, { marginLeft: 10 }]}>Address: </Text>
            <View style={styles.underlineData}><Text>{String(data.administratorAddress || '').toUpperCase()}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4, alignItems: 'flex-start' }]}>
            <View style={{ width: 70 }}>
              <Text style={{ fontSize: 10 }}>Location of</Text>
              <Text style={{ fontSize: 10 }}>Property: </Text>
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

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <View style={[styles.gridItem, { flex: 1.2 }]}><Text style={styles.label10}>OCT/TCT No. </Text><View style={styles.underlineData}><Text>{data.octTctNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 1, marginLeft: 8 }]}><Text style={styles.label10}>Survey No.: </Text><View style={styles.underlineData}><Text>{data.surveyNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.8, marginLeft: 8 }]}><Text style={styles.label10}>Lot No.: </Text><View style={styles.underlineData}><Text>{data.lotNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.7, marginLeft: 8 }]}><Text style={styles.label10}>Blk. No.: </Text><View style={styles.underlineData}><Text>{data.blkNumber}</Text></View></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={{ width: 100, fontSize: 10 }}>Boundaries: North: </Text>
            <View style={styles.underlineData}><Text>{data.boundaryNorth}</Text></View>
            <Text style={{ marginLeft: 10, fontSize: 10 }}>South: </Text>
            <View style={styles.underlineData}><Text>{data.boundarySouth}</Text></View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={{ width: 100, textAlign: 'right', paddingRight: 4, fontSize: 10 }}>East: </Text>
            <View style={styles.underlineData}><Text>{data.boundaryEast}</Text></View>
            <Text style={{ marginLeft: 10, fontSize: 10 }}>West: </Text>
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
              <View style={[styles.tdCell, { justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(row.marketValue)}</Text></View>
              <View style={[styles.tdCell, { justifyContent: 'center' }]}><Text>{row.assessmentLevel ? `${row.assessmentLevel}%` : ''}</Text></View>
              <View style={[styles.tdCell, { justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(row.assessedValue)}</Text></View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <View style={[styles.tdCell, { borderBottomWidth: 0, justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(totalMarketValue)}</Text></View>
            <View style={{ width: '19%' }} />
            <Text style={[styles.totalLabel, { width: 45, textAlign: 'left' }]}>TOTAL</Text>
            <View style={[styles.tdCell, { borderBottomWidth: 0, justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(totalAssessedValue)}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={styles.label10}>Total Assessed Value: </Text>
            <View style={styles.underlineData}><Text style={{ fontFamily: 'Times-BoldItalic' }}>{String(data.totalAssessedValueWords || '').toUpperCase()}</Text></View>
          </View>
          <Text style={{ fontSize: 8.5, textAlign: 'center', marginBottom: 4 }}>(Amount in Words)</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Area: </Text>
            <View style={styles.underlineData}><Text>{data.area}</Text></View>
            <Text style={{ marginLeft: 10, fontSize: 10 }}>Tax Effectivity: </Text>
            <View style={styles.underlineData}><Text>{data.taxEffectivity}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={{ fontSize: 10, marginRight: 20 }}>Taxable [ {data.taxable ? 'X' : ' '} ]</Text>
            <Text style={{ fontSize: 10 }}>Exempt [ {!data.taxable ? 'X' : ' '} ]</Text>
          </View>

          {/* VERIFIED BY & ASSESSOR */}
          <View style={styles.signatureSection}>
            <View style={styles.verifiedBlock}>
              <Text style={{ marginBottom: 2, fontSize: 10 }}>Verified by:</Text>
              <View style={styles.signatureUnderline}><Text>{data.verifiedByName || ''}</Text></View>
            </View>
            <View style={styles.assessorBlock}>
              <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>{data.assessorName ? `(SGD) ${data.assessorName}` : ' '}</Text>
              <View style={styles.signatureUnderline} />
              <Text style={styles.signatureSubLabel}>{data.assessorTitle || 'Municipal Assessor'}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={{ fontSize: 10 }}>This declaration cancels ARP No. </Text>
            <View style={styles.underlineData}><Text>{data.cancelsArpNo}</Text></View>
          </View>

          <View style={styles.memoContainer}>
            <View style={styles.memoLabelRow}>
              <Text style={{ fontSize: 10 }}>Memoranda: </Text>
              <View style={[styles.memoLine, { flex: 1 }]}>
                <Text style={{ fontFamily: 'Times-BoldItalic', fontSize: 10 }}>{data.memoranda}</Text>
              </View>
            </View>
            <View style={styles.memoLine} />
            <View style={styles.memoLine} />
          </View>

          {/* CERTIFIED COPY BOX */}
          <View style={styles.certifiedBox}>
            <View style={styles.certLeftBlock}>
              <Text style={{ width: 65, fontSize: 9.5 }}>Certified copy:</Text>

              <View style={styles.certSignatoryBlock}>
                <Text style={{ fontFamily: 'Times-Bold', fontSize: 9.5 }}>{certifiedByName}</Text>
                <Text style={{ fontSize: 8.5, marginBottom: 2 }}>{certifiedByTitle}</Text>

                <View style={{ borderTopWidth: 1, width: '100%', alignItems: 'center' }}>
                  <Text style={{ fontSize: 8.5, marginTop: 2 }}>Authorized Signatory</Text>
                </View>
              </View>
            </View>

            <View style={{ width: '40%', paddingLeft: 5 }}>
              <View style={styles.certRightRow}>
                <Text style={{ fontSize: 9.5 }}>Certification Fee: </Text>
                <Text style={styles.certValueUnderline}>Php. 40.00</Text>
              </View>
              <View style={styles.certRightRow}>
                <Text style={{ fontSize: 9.5 }}>O.R. No.: </Text>
                <Text style={styles.certValueUnderline}>{orNumber}</Text>
              </View>
              <View style={styles.certRightRow}>
                <Text style={{ fontSize: 9.5 }}>Date paid: </Text>
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