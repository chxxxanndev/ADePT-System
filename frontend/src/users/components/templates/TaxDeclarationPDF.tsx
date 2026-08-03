import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// REGISTER THE CASTELLAR FONT
Font.register({
  family: 'Castellar',
  src: window.location.origin + '/fonts/castellar.ttf'
});

// REGISTER BOOKMAN OLD STYLE
Font.register({
  family: 'BookmanOldStyle',
  fonts: [
    { src: window.location.origin + '/fonts/bookos.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: window.location.origin + '/fonts/bookosb.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: window.location.origin + '/fonts/bookosi.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: window.location.origin + '/fonts/bookosbi.ttf', fontWeight: 'bold', fontStyle: 'italic' }
  ]
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
  headerCenter: { textAlign: 'center', marginBottom: 50 },
  h8: { fontSize: 10 },
  h10: { fontSize: 12, fontFamily: 'Times-Bold' },
  h11: { fontSize: 14, fontFamily: 'Times-Bold' },
  h7: { fontSize: 9 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  refItem: { flexDirection: 'row', alignItems: 'flex-end', flex: 1 },
  refUnderline: { borderBottomWidth: 1, borderBottomColor: '#000', flex: 1, textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10.5, height: 14, paddingBottom: 0 },
  title: { fontSize: 16, fontFamily: 'Castellar', textAlign: 'center', marginTop: 20, marginBottom: 30 },
  fieldRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  label10: { fontSize: 10 },
  underlineData: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    paddingLeft: 4, 
    fontSize: 10.5, 
    fontFamily: 'BookmanOldStyle', 
    fontWeight: 'bold', 
    minHeight: 14, 
    justifyContent: 'flex-end',
    textAlign: 'center',
  },
  locationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  locationColumn: { width: '32%', alignItems: 'center' },
  locationLine: { borderBottomWidth: 1, width: '100%', textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, minHeight: 14 },
  locationSubLabel: { fontSize: 9, marginTop: 2 },
  gridItem: { flexDirection: 'row', alignItems: 'flex-end' },
  descriptionText: { fontSize: 11, textAlign: 'left', marginTop: 3, marginBottom: 4 },
  doubleLine: { borderBottomWidth: 1, borderTopWidth: 1, height: 3, width: '100%', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  thCell: { fontSize: 11, textAlign: 'center' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, height: 15 },
  tdCell: { width: '19%', borderBottomWidth: 1, fontSize: 10, fontFamily: 'BookmanOldStyle', fontWeight: 'bold', paddingLeft: 2, flexDirection: 'row', alignItems: 'flex-end' },
  totalLabel: { fontSize: 9.5, fontFamily: 'Times-Bold', width: '40%', textAlign: 'right', paddingRight: 10, marginTop: 2 },

  // Certified Box
  certifiedBox: { borderWidth: 1, padding: 6, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  certLeftBlock: { width: '60%', flexDirection: 'row' },
  certSignatoryBlock: { flex: 1, alignItems: 'center', paddingRight: 10, paddingTop: 2 },
  certRightRow: { flexDirection: 'row', marginBottom: 2 },
  certValueUnderline: { borderBottomWidth: 1, flex: 1, fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 9.5, paddingLeft: 4, textAlign: 'center' },
  importantText: { fontSize: 8.5, marginTop: 5, textAlign: 'justify' }
});

const peso = (n: any) => (n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

const COL = {
  kind: '15%',
  classification: '21%',
  marketValue: '22%',
  assessmentLevel: '14%',
  assessedValue: '22%',
};

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
            <Text style={{ fontSize: 10 }}>Tel No. 908 - 1855</Text>
          </View>

          <View style={styles.refRow}>
            <View style={[styles.refItem, { marginRight: 15 }]}>
              <Text style={styles.label10}>Assessment of Real Property No.: </Text>
              <View style={styles.refUnderline}><Text style={{ fontSize: 12 }}>{data.taxDeclarationNumber}</Text></View>
            </View>
            <View style={styles.refItem}>
              <Text style={styles.label10}>Property Index No.: </Text>
              <View style={styles.refUnderline}><Text style={{ fontSize: 12 }}>{data.propertyIndexNumber}</Text></View>
            </View>
          </View>

          <Text style={styles.title}>DECLARATION OF REAL PROPERTY</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Owner: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 12 }}>{String(data.ownerName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label10, { marginLeft: 10 }]}>Address: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 9 }}>{String(data.ownerAddress || '').toUpperCase()}</Text></View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Administrator: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 9 }}>{String(data.administratorName || '').toUpperCase()}</Text></View>
            <Text style={[styles.label10, { marginLeft: 10 }]}>Address: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 9 }}>{String(data.administratorAddress || '').toUpperCase()}</Text></View>
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
            <View style={[styles.gridItem, { flex: 1.2 }]}><Text style={styles.label10}>OCT/TCT No. </Text><View style={styles.underlineData}><Text style={{ fontSize: 10 }}>{data.octTctNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 1, marginLeft: 8 }]}><Text style={styles.label10}>Survey No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 10 }}>{data.surveyNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.8, marginLeft: 8 }]}><Text style={styles.label10}>Lot No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 10 }}>{data.lotNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.7, marginLeft: 8 }]}><Text style={styles.label10}>Blk. No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 10 }}>{data.blkNumber}</Text></View></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={{ width: 100, fontSize: 10 }}>Boundaries: North: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 8 }}>{data.boundaryNorth}</Text></View>
            <Text style={{ marginLeft: 10, fontSize: 10 }}>South: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 8 }}>{data.boundarySouth}</Text></View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={{ width: 100, textAlign: 'right', paddingRight: 4, fontSize: 10 }}>East: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 8 }}>{data.boundaryEast}</Text></View>
            <Text style={{ marginLeft: 10, fontSize: 10 }}>West: </Text>
            <View style={styles.underlineData}><Text style={{ fontSize: 8 }}>{data.boundaryWest}</Text></View>
          </View>

          <Text style={styles.descriptionText}>(State streets, streams or PIN by bounded, or names of owner of adjoining lands)</Text>
          <View style={styles.doubleLine} />

          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { width: COL.kind }]}>Kind of Property</Text>
            <Text style={[styles.thCell, { width: COL.classification }]}>Classification</Text>
            <Text style={[styles.thCell, { width: COL.marketValue }]}>Market Value</Text>
            <View style={[styles.thCell, { width: COL.assessmentLevel }]}><Text>Assessment Level (%)</Text></View>
            <Text style={[styles.thCell, { width: COL.assessedValue }]}>Assessed Value</Text>
          </View>

          {tableRows.map((row: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={[styles.tdCell, { width: COL.kind, justifyContent: 'center' }]}><Text style={{ textAlign: 'center', width: '100%' }}>{row.kindOfProperty || ' '}</Text></View>
              <View style={[styles.tdCell, { width: COL.classification, justifyContent: 'center' }]}><Text style={{ textAlign: 'center', width: '100%' }}>{row.classificationLabel ? String(row.classificationLabel).toUpperCase() : ' '}</Text></View>
              <View style={[styles.tdCell, { width: COL.marketValue, justifyContent: 'space-between' }]}>
                <Text>{i === 0 ? 'P' : ''}</Text>
                <Text>{peso(row.marketValue)}</Text>
              </View>
              <View style={[styles.tdCell, { width: COL.assessmentLevel, justifyContent: 'flex-end', paddingRight: 4 }]}><Text>{row.assessmentLevel ? `${row.assessmentLevel}%` : ''}</Text></View>
              <View style={[styles.tdCell, { width: COL.assessedValue, justifyContent: 'space-between' }]}>
                <Text>{i === 0 ? 'P' : ''}</Text>
                <Text>{peso(row.assessedValue)}</Text>
              </View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <View style={[styles.tdCell, { width: COL.marketValue, justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(totalMarketValue)}</Text></View>
            <View style={{ width: COL.assessmentLevel }} />
            <Text style={[styles.totalLabel, { width: 45, textAlign: 'left' }]}>TOTAL</Text>
            <View style={[styles.tdCell, { width: COL.assessedValue, justifyContent: 'space-between' }]}><Text>P</Text><Text>{peso(totalAssessedValue)}</Text></View>
          </View>

          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={styles.label10}>Total Assessed Value: </Text>
            <View style={[styles.underlineData, { textAlign: 'left' }]}><Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontStyle: 'italic' }}>{String(data.totalAssessedValueWords || '')}</Text></View>
          </View>
          <Text style={{ fontSize: 8.5, textAlign: 'center', marginBottom: 4 }}>(Amount in Words)</Text>

          {/* AREA & TAX EFFECTIVITY */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '45%' }}>
              <Text style={{ fontSize: 10 }}>Area: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', minHeight: 14 }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{data.area}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '40%' }}>
              <Text style={{ fontSize: 10 }}>Tax Effectivity: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', minHeight: 14 }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{data.taxEffectivity}</Text>
              </View>
            </View>
          </View>

          {/* TAXABLE / EXEMPT */}
          <View style={[styles.fieldRow, { marginTop: 4 }]}>
            <Text style={{ fontSize: 10, marginRight: 20 }}>Taxable [ {data.taxable ? 'X' : ' '} ]</Text>
            <Text style={{ fontSize: 10 }}>Exempt [ {!data.taxable ? 'X' : ' '} ]</Text>
          </View>

          {/* ============================================================ */}
          {/* VERIFIED BY & ASSESSOR SECTION (FIXED: MIRRORED & ALIGNED)   */}
          {/* ============================================================ */}
          <View style={{ marginTop: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>Verified by:</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              
              {/* Left Column: Verified By Underline */}
              <View style={{ width: '42%', alignItems: 'center' }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%', minHeight: 18, justifyContent: 'flex-end' }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10.5, textAlign: 'center' }}>
                    {data.verifiedByName || ''}
                  </Text>
                </View>
                {/* Space below to mirror the Assessor title height */}
                <Text style={{ fontSize: 9, marginTop: 2, opacity: 0 }}>Spacer</Text> 
              </View>

              {/* Right Column: Municipal Assessor */}
              <View style={{ width: '42%', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10.5, textAlign: 'center' }}>
                  {data.assessorName || ''}
                </Text>
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%' }} />
                <Text style={{ fontSize: 9, marginTop: 2, textAlign: 'center' }}>
                  {data.assessorTitle || 'Municipal Assessor'}
                </Text>
              </View>

            </View>
          </View>

          {/* CANCELS ARP NO. */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, marginBottom: 6 }}>
            <Text style={{ fontSize: 10 }}>This declaration cancels ARP No. </Text>
            <View style={{ width: 220, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', minHeight: 14 }}>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{data.cancelsArpNo || ''}</Text>
            </View>
          </View>

          {/* ============================================================ */}
          {/* MEMORANDA (FIXED: RULED LINE WRAPPING)                       */}
          {/* ============================================================ */}
          <View style={{ position: 'relative', marginTop: 2 }}>
            {/* BACKGROUND LAYER: The ruled lines */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
               {/* Line 1: Starts after the "Memoranda:" label space */}
               <View style={{ flexDirection: 'row', height: 15 }}>
                 <View style={{ width: 65 }} />
                 <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000' }} />
               </View>
               {/* Line 2 & 3: Full width */}
               <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', height: 15 }} />
               <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', height: 15 }} />
            </View>

            {/* TEXT LAYER: The actual content */}
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 10, width: 65 }}>Memoranda: </Text>
              <View style={{ flex: 1 }}>
                <Text 
                  /* Prevents the FFFFF crash for long words with no spaces */
                  hyphenationCallback={(word) => [word]} 
                  style={{ 
                    fontFamily: 'BookmanOldStyle', 
                    fontWeight: 'bold', 
                    fontStyle: 'italic', 
                    fontSize: 9.5,
                    lineHeight: 1.58, // Math: (15px line height / 9.5 fontSize)
                    paddingTop: 1.5   // Vertically aligns text to sit perfectly on the line
                  }}
                >
                  {data.memoranda || ''}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Gap before the Certified Box */}
          <View style={{ height: 12 }} />

          {/* CERTIFIED COPY BOX */}
          <View style={styles.certifiedBox}>
            <View style={styles.certLeftBlock}>
              <Text style={{ width: 65, fontSize: 9.5 }}>Certified copy:</Text>

              <View style={styles.certSignatoryBlock}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 9.5 }}>{certifiedByName}</Text>
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