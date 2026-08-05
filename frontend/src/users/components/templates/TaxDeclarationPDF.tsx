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
  // NEW: header image style (same pattern as CertOfLandholdingPDF's headerImage)
  headerImage: {
    width: '100%',
    height: 'auto',
  },
  formNoTag: { position: 'absolute', top: 15, left: 36, fontSize: 8 },
  content: { paddingHorizontal: 38, paddingTop: 15, paddingBottom: 15 },
  headerCenter: { textAlign: 'center' },
  h8: { fontSize: 9},
  h10: { fontSize: 11, fontFamily: 'Times-Bold' },
  h11: { fontSize: 12, fontFamily: 'Times-Bold' },
  h7: { fontSize: 8},

  // Reference Row
  refRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: -10, },
  refItem: { flexDirection: 'row', alignItems: 'flex-end', flex: 1 },
  refUnderline: { borderBottomWidth: 1, borderBottomColor: '#000', flex: 1, textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10.5, height: 14, paddingBottom: 0 },

  // Title
  title: { fontSize: 16, fontFamily: 'Castellar', textAlign: 'center' },

  // Field Rows
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end' },
  label10: { fontSize: 11 },
  underlineData: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    paddingLeft: 4, 
    fontSize: 10.5, 
    fontFamily: 'BookmanOldStyle', 
    fontWeight: 'bold', 
    minHeight: 14, 
    justify: 'flex-end',
    textAlign: 'center',
  },
  
  locationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  locationColumn: { width: '32%', alignItems: 'center' },
  locationLine: { borderBottomWidth: 1, width: '100%', textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, minHeight: 14 },
  locationSubLabel: { fontSize: 10, marginTop: 2 },
  
  gridItem: { flexDirection: 'row', alignItems: 'flex-end' },
  descriptionText: { fontSize: 11, textAlign: 'left' },
  doubleLine: { borderBottomWidth: 1, borderTopWidth: 1, height: 3, width: '100%' },
  
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  thCell: { fontSize: 11, textAlign: 'center' },
  
  // Certified Box
  certifiedBox: { borderWidth: 0.5, padding: 6, flexDirection: 'row', justifyContent: 'space-between' },
  certLeftBlock: { width: '60%', flexDirection: 'row' },
  certSignatoryBlock: { flex: 1, alignItems: 'center', paddingRight: 10, paddingTop: 2 },
  certRightRow: { flexDirection: 'row', marginBottom: 2 },
  certValueUnderline: { borderBottomWidth: 1, flex: 1, fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11, paddingLeft: 4, textAlign: 'left' },
  importantText: { fontSize: 11, textAlign: 'justify' }
});

const peso = (n: any) => (n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

export const TaxDeclarationPDF = ({
  data = {},
  orNumber = '',
  datePaid = '',
  certifiedByName = '',
  certifiedByTitle = ''
}: any) => {
  const rows = data.assessmentRows || data.assessments || [];
  // Guaranteed 4 blank/underline rows
  const tableRows = [...rows, ...Array(Math.max(0, 4 - rows.length)).fill({})];

  const totalMarketValue = rows.reduce((sum: any, r: any) => sum + (Number(r.marketValue) || 0), 0);
  const totalAssessedValue = rows.reduce((sum: any, r: any) => sum + (Number(r.assessedValue) || 0), 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Image fixed src={window.location.origin + '/images/official_bg.png'} style={styles.background} />

        {/* HEADER IMAGE (replaces hardcoded Republic/Province/Office text header) */}
        <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />

        <Text style={styles.formNoTag}>RPA FORM NO. 1A</Text>

        <View style={styles.content}>
          {/* ASSESSMENT OF REAL PROPERTY NO. LINE */}
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

          {/* [2 enter spaces after Assessment line] */}
          <View style={{ height: 6 }} />

          {/* DECLARATION OF REAL PROPERTY */}
          <Text style={styles.title}>DECLARATION OF REAL PROPERTY</Text>

          {/* [1 enter space (16 font size)] */}
          <View style={{ height: 16 }} />
          {/* [1 enter space (11 font size)] */}
          <View style={{ height: 11 }} />

          {/* ROW 1: OWNER & ADDRESS */}
            <View style={{ width: '100%', marginBottom: 4 }}>
            
            {/* ROW 1: OWNER & ADDRESS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              
              {/* Left: Owner */}
              <View style={{ width: '58%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10 }}>Owner: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'center' }}>
                    {data.ownerName || ''}
                  </Text>
                </View>
              </View>

              {/* Right: Owner Address */}
              <View style={{ width: '38%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10 }}>Address: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'left' }}>
                    {data.ownerAddress || ''}
                  </Text>
                </View>
              </View>

            </View>

            {/* ROW 2: ADMINISTRATOR & ADDRESS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              
              {/* Left: Administrator */}
              <View style={{ width: '58%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10 }}>Administrator: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'center' }}>
                    {data.administratorName || data.administrator_name || ''}
                  </Text>
                </View>
              </View>

              {/* Right: Admin Address */}
              <View style={{ width: '38%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10 }}>Address: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'left' }}>
                    {data.administratorAddress || data.administrator_address || ''}
                  </Text>
                </View>
              </View>

            </View>

          </View>

          {/* [1 space after Administrator] */}
          <View style={{ height: 9 }} />

          {/* LOCATION OF PROPERTY */}
            <View style={[styles.fieldRow, { alignItems: 'flex-start' }]}>
              
              {/* Stacked label without fixed width */}
              <View style={{ marginRight: 4 }}>
                <Text style={{ fontSize: 11 }}>Location of</Text>
                <Text style={{ fontSize: 11 }}>Property:</Text>
              </View>
              
              {/* Pushed down slightly to sit on the baseline of "Property:" */}
              <View style={[styles.locationContainer, { flex: 1, paddingTop: 8, flexDirection: 'row' }]}>
                {/* Barangay */}
                <View style={[styles.locationColumn, { marginRight: 15 }]}>
                  <Text style={styles.locationLine}>{data.barangay}</Text>
                  <Text style={styles.locationSubLabel}>(Barangay)</Text>
                </View>

                {/* Municipality */}
                <View style={[styles.locationColumn, { marginRight: 15 }]}>
                  <Text style={styles.locationLine}>{data.municipality}</Text>
                  <Text style={styles.locationSubLabel}>(Municipality)</Text>
                </View>

                {/* Province */}
                <View style={styles.locationColumn}>
                  <Text style={[styles.locationLine, { fontFamily: 'Times-Bold' }]}>ZAMBOANGA DEL NORTE</Text>
                  <Text style={styles.locationSubLabel}>(Province)</Text>
                </View>
              </View>

            </View>

          {/* [1 space (font size 14)] */}
          <View style={{ height: 14 }} />

          {/* OCT/TCT NO. */}
          <View style={styles.fieldRow}>
            <View style={[styles.gridItem, { flex: 1.2 }]}><Text style={styles.label10}>OCT/TCT No. </Text><View style={styles.underlineData}><Text style={{ fontSize: 9 }}>{data.octTctNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 1, marginLeft: 8 }]}><Text style={styles.label10}>Survey No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 10 }}>{data.surveyNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.8, marginLeft: 8 }]}><Text style={styles.label10}>Lot No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 11 }}>{data.lotNumber}</Text></View></View>
            <View style={[styles.gridItem, { flex: 0.7, marginLeft: 8 }]}><Text style={styles.label10}>Blk. No.: </Text><View style={styles.underlineData}><Text style={{ fontSize: 11 }}>{data.blkNumber}</Text></View></View>
          </View>

          {/* [1 space (font size 14)] */}
          <View style={{ height: 14 }} />

          {/* BOUNDARIES SECTION */}
            <View style={{ width: '100%', marginBottom: 4 }}>

              {/* ROW 1: NORTH & SOUTH */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                
                {/* Left Column: Boundaries: North */}
                <View style={{ width: '58%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11 }}>Boundaries: </Text>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>North: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 8, textAlign: 'left' }}>
                      {data.boundaryNorth}
                    </Text>
                  </View>
                </View>

                {/* Right Column: South */}
                <View style={{ width: '38%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>South: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 8, textAlign: 'left' }}>
                      {data.boundarySouth}
                    </Text>
                  </View>
                </View>

              </View>

              {/* ROW 2: EAST & WEST */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                
                {/* Left Column: East (Blank space spacer matching 'Boundaries: ') */}
                <View style={{ width: '58%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: 'transparent' }}>Boundaries: </Text>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>East: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 8, textAlign: 'left' }}>
                      {data.boundaryEast}
                    </Text>
                  </View>
                </View>

                {/* Right Column: West */}
                <View style={{ width: '38%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>West: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 12 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 8, textAlign: 'left' }}>
                      {data.boundaryWest}
                    </Text>
                  </View>
                </View>

              </View>

            </View>

          {/* [1 space] */}
          <View style={{ height: 11 }} />

          {/* (State streets, streams...) */}
          <Text style={styles.descriptionText}>(State streets, streams or PIN by bounded, or names of owner of adjoining lands)</Text>

          {/* [1 space] */}
          <View style={{ height: 11 }} />

          {/* DOUBLE LINE */}
          <View style={styles.doubleLine} />

          {/* [1 space] */}
          <View style={{ height: 11 }} />

          {/* KIND OF PROPERTY (TABLE HEADERS) */}
          <View style={[styles.tableHeader, { justifyContent: 'flex-start', paddingLeft: 2 }]}>
            <Text 
              hyphenationCallback={(word) => [word]} 
              style={[styles.thCell, { width: '16%', fontSize: 9.5 }]}
            >
              Kind of Property
            </Text>
            <Text style={[styles.thCell, { width: '18%', marginLeft: '1%' }]}>Classification</Text> 
            <Text style={[styles.thCell, { width: '20%', marginLeft: '4%' }]}>Market Value</Text>
            <View style={[styles.thCell, { width: '12%', marginLeft: '4%' }]}><Text>Assessment Level (%)</Text></View>
            <Text style={[styles.thCell, { width: '20%', marginLeft: '4%' }]}>Assessed Value</Text>
          </View>

          {tableRows.map((row: any, i: number) => {
            const mVal = row.marketValue || row.market_value;
            const aVal = row.assessedValue || row.assessed_value;
            const kind = row.kindOfProperty || row.kind_of_property || '';
            const classification = row.classificationLabel || row.classification_label || '';
            const aLevel = row.assessmentLevel || row.assessment_level;

            return (
              <View key={i} style={{ flexDirection: 'row', height: 16, alignItems: 'flex-end', justifyContent: 'flex-start', paddingLeft: 2, marginBottom: -4 }}>
                <View style={{ width: '16%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', justifyContent: 'flex-end', paddingBottom: 2 }}>
                  <Text style={{ textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{kind}</Text>
                </View>

                <View style={{ width: '18%', marginLeft: '1%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', justifyContent: 'flex-end', paddingBottom: 2 }}>
                  <Text style={{ textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 9 }}>{classification}</Text>
                </View>

                <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 2 }}>
                  <Text style={{ fontFamily: 'Times-Roman', fontSize: 10 }}>{(mVal || mVal === 0) && i === 0 ? 'P' : ''}</Text>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(mVal)}</Text>
                </View>

                <View style={{ width: '12%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', justifyContent: 'flex-end', paddingRight: 4, paddingBottom: 2 }}>
                  <Text style={{ textAlign: 'right', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{aLevel ? `${aLevel}%` : ''}</Text>
                </View>

                <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 2 }}>
                  <Text style={{ fontFamily: 'Times-Roman', fontSize: 10 }}>{(aVal || aVal === 0) && i === 0 ? 'P' : ''}</Text>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(aVal)}</Text>
                </View>
              </View>
            );
          })}

          {/* TOTALS */}
          <View style={{ flexDirection: 'row', marginTop: 4, justifyContent: 'flex-start', paddingLeft: 2 }}>
            <View style={{ width: '16%' }} />
            <View style={{ width: '18%', marginLeft: '1%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Times-Bold', marginRight: 4 }}>TOTAL</Text>
            </View>
            <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 10 }}>P</Text>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(totalMarketValue)}</Text>
            </View>
            <View style={{ width: '12%', marginLeft: '4%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Times-Bold', marginRight: 4 }}>TOTAL</Text>
            </View>
            <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 10 }}>P</Text>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(totalAssessedValue)}</Text>
            </View>
          </View>

          {/* [1 space (font size 14)] */}
          <View style={{ height: 10 }} />

          {/* TOTAL ASSESSED VALUE & AMOUNT IN WORDS (No gap between them) */}
          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Total Assessed Value: </Text>
            <View style={[styles.underlineData, { textAlign: 'left' }]}><Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontStyle: 'italic' }}>{String(data.totalAssessedValueWords || '')}</Text></View>
          </View>
          <Text style={{ fontSize: 10, textAlign: 'center' }}>(Amount in Words)</Text>

          {/* AREA & TAX EFFECTIVITY (No gap) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '25%' }}>
              <Text style={{ fontSize: 11 }}>Area: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', minHeight: 14 }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11 }}>{data.area}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '30%' }}>
              <Text style={{ fontSize: 11 }}>Tax Effectivity: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', minHeight: 14 }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11 }}>{data.taxEffectivity}</Text>
              </View>
            </View>
          </View>

          {/* TAXABLE / EXEMPT (No gap) */}
          <View style={styles.fieldRow}>
            <Text style={{ fontSize: 11, marginRight: 20 }}>Taxable [ {data.taxable ? 'X' : ' '} ]</Text>
            <Text style={{ fontSize: 11 }}>Exempt [ {!data.taxable ? 'X' : ' '} ]</Text>
          </View>

          {/* [1 space (font size 8)] */}
          <View style={{ height: 8 }} />

          {/* VERIFIED BY & MUNICIPAL ASSESSOR */}
            <View>
              {/* Label */}
              <Text style={{ fontSize: 11, marginBottom: 2 }}>Verified by:</Text>

              {/* Signature Lines Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                
                {/* Left Column: Verified By Line */}
                <View style={{ width: '32%', marginLeft: 50 }}>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%', minHeight: 14, justifyContent: 'flex-end' }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'center' }}>
                      {data.verifiedByName || ''}
                    </Text>
                  </View>
                </View>

                {/* Right Column: Municipal Assessor Line & Title */}
                <View style={{ width: '32%', alignItems: 'center' }}>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%', minHeight: 14, justifyContent: 'flex-end' }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, textAlign: 'center' }}>
                      {data.assessorName ? `(SGD.) ${data.assessorName}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                    {(data.assessorTitle || 'MUNICIPAL ASSESSOR').toUpperCase()}
                  </Text>
                </View>

              </View>
            </View>

          {/* THIS DECLARATION CANCELS ARP NO. (No gap) */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11 }}>This declaration cancels ARP No. </Text>
            <View style={{ width: 100, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'left', minHeight: 14 }}>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{data.cancelsArpNo || ''}</Text>
            </View>
          </View>

          {/* MEMORANDA (3 RULED UNDERLINES) (No gap) */}
          <View style={{ position: 'relative' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
               <View style={{ flexDirection: 'row', height: 15 }}>
                 <View style={{ width: 65 }} />
                 <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000' }} />
               </View>
               <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', height: 15 }} />
               <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', height: 15 }} />
            </View>

            <View style={{ flexDirection: 'row' }}>
              <Text style={{ fontSize: 11, width: 65 }}>Memoranda: </Text>
              <View style={{ flex: 1 }}>
                <Text 
                  hyphenationCallback={(word) => [word]} 
                  style={{ 
                    fontFamily: 'BookmanOldStyle', 
                    fontWeight: 'bold', 
                    fontStyle: 'italic', 
                    fontSize: 9,
                    lineHeight: 1.58,
                    paddingTop: 1.6
                  }}
                >
                  {data.memoranda || ''}
                </Text>
              </View>
            </View>
          </View>
          
          {/* CERTIFIED TRUE COPY BOX */}
            <View style={{ height: 20 }} />

            <View style={styles.certifiedBox}>
              {/* LEFT COLUMN: Certified copy & Signatory */}
              <View style={{ width: '55%', flexDirection: 'row' }}>
                {/* Top-aligned label */}
                <Text style={{ width: 85, fontSize: 11 }}>Certified copy:</Text>

                {/* Signatory block pushed down to line up with O.R. No. */}
                <View style={{ flex: 1, alignItems: 'center', paddingRight: 10, marginTop: 12 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11 }}>
                    {certifiedByName}
                  </Text>
                  <Text style={{ fontSize: 11, textAlign: 'center' }}>
                    {certifiedByTitle}
                  </Text>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#000', width: '80%', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 11 }}>Authorized Signatory</Text>
                  </View>
                </View>
              </View>

              {/* RIGHT COLUMN: Stacked Fee, O.R. No., and Date Paid */}
              <View style={{ width: '42%', alignItems: 'flex-end' }}>
                {/* Certification Fee Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 }}>
                  <Text style={{ fontSize: 11 }}>Certification Fee: </Text>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 75 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11, textAlign: 'left' }}>
                      Php. 40.00
                    </Text>
                  </View>
                </View>

                {/* O.R. No. Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 }}>
                  <Text style={{ fontSize: 11 }}>O.R. No.: </Text>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 105 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11, textAlign: 'left' }}>
                      {orNumber}
                    </Text>
                  </View>
                </View>

                {/* Date Paid Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11 }}>Date paid: </Text>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 100 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11, textAlign: 'left' }}>
                      {datePaid}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

          {/* [1 space] */}
          <View style={{ height: 11 }} />

          {/* IMPORTANT TEXT */}
          <Text style={styles.importantText}>
            IMPORTANT: This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should not be considered as title to the property.
          </Text>

          {/* [1 space - End] */}
          <View style={{ height: 11 }} />
        </View>
      </Page>
    </Document>
  );
};