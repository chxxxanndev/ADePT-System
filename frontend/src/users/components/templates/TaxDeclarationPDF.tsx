import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { fitFontSizeToWidth, fitFontSizeToLines, measureTextWidth, estimateWidth, useTextMeasureReady } from './textFit';

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
  bottom: 0,
  left: 0, 
  right: 0,
  width: '100%',
  height: 200,
  objectFit: 'cover',
  zIndex: -1,
},
  // NEW: header image style (same pattern as CertOfLandholdingPDF's headerImage)
  headerImage: {
    width: '100%',
    objectFit: 'contain',
  },
  // In styles:
  formNoTag: { 
  position: 'absolute', 
  top: 25, 
  left: 25, 
  fontSize: 6, 
  fontFamily: 'Times-Roman',
  color: '#000000',
},
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
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end'},
  label10: { fontSize: 11 },
  underlineData: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    paddingLeft: 4, 
    fontSize: 10.5, 
    fontFamily: 'BookmanOldStyle', 
    fontWeight: 'bold', 
    height: 14, 
    overflow: 'hidden',
    justify: 'flex-end',
    textAlign: 'center',
  },
  
  locationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  locationColumn: { width: '32%', alignItems: 'center' },
  locationLine: { borderBottomWidth: 1, width: '100%', textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10, height: 14, overflow: 'hidden' },
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
  importantWrapper: {
  backgroundColor: 'white',
  paddingVertical: 3,
  paddingHorizontal: 2,
  paddingRight: 10,  // ← add this
  marginTop: 8,
},
importantLabel: {
  fontSize: 11,
  // fontFamily: 'Times-Bold',
  width: 78,
},
importantBody: {
  fontSize: 11,
  flex: 1,
  textAlign: 'justify',
},
importantRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
},
});

const peso = (n: any) => (n ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

const formatArea = (n: any) => {
  if (!n && n !== 0) return '';
  // Accept a bare number OR a display string like "123,456.78 sqm.".
  // Split the numeric part from any unit suffix first, reformat the number
  // with thousand separators, then re-append the suffix ("sqm." / "has.").
  const str = String(n).trim();
  const unitMatch = str.match(/^([\d.,]+)\s*(.*)$/);
  const numPart = unitMatch ? unitMatch[1] : str;
  const suffix = unitMatch ? unitMatch[2].trim() : '';
  const cleaned = numPart.replace(/,/g, '');
  const num = Number(cleaned);
  if (isNaN(num)) return str; // non-numeric fallback, leave untouched
  const decimalPlaces = cleaned.includes('.') ? cleaned.split('.')[1].length : 0;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return suffix ? `${formatted} ${suffix}` : formatted;
};

// ---------------------------------------------------------------------------
// Tax Declaration layout adjustments (released from DocumentReleasePanel).
// All values are "base" font sizes: auto-fit still shrinks from them (down to
// autoFitFloor) when a long value would otherwise wrap and push the fixed
// one-page LETTER form out of alignment.
// ---------------------------------------------------------------------------
export interface TDTemplateSpacing {
    autoFitEnabled: 0 | 1;   // master switch for the auto-shrink behaviour
    autoFitFloor: number;    // smallest size long text may shrink to (pt)
    ownerFontSize: number;      // Owner/Administrator name + address
    locationFontSize: number;   // Barangay / Municipality / Province
    boundaryNorthFontSize: number;   // North boundary
    boundarySouthFontSize: number;   // South boundary
    boundaryEastFontSize: number;    // East boundary
    boundaryWestFontSize: number;    // West boundary
    tableFontSize: number;      // Kind of Property / Classification cells
    amountWordsFontSize: number;// Total Assessed Value (amount in words)
    memorandaFontSize: number;  // Memoranda block
    assessorFontSize: number;   // Verified-by / Assessor signature names
    assessorMarginLeft: number; // horizontal nudge of the Assessor name (pt)
    certNameFontSize: number;   // Certified Copy signatory name
    certTitleFontSize: number;  // Certified Copy signatory title
    certOffsetX: number;        // horizontal nudge of the signatory block (pt)
    certOffsetY: number;        // vertical nudge of the signatory block (pt)
    certRowGap: number;         // spacing between Cert. Fee / O.R. / Date rows
}

export const DEFAULT_TD_TEMPLATE_SPACING: TDTemplateSpacing = {
    autoFitEnabled: 1,
    autoFitFloor: 5,
    ownerFontSize: 10,
    locationFontSize: 10,
    boundaryNorthFontSize: 8,
    boundarySouthFontSize: 8,
    boundaryEastFontSize: 8,
    boundaryWestFontSize: 8,
    tableFontSize: 10,
    amountWordsFontSize: 10.5,
    memorandaFontSize: 9,
    assessorFontSize: 10,
    assessorMarginLeft: 0,
    certNameFontSize: 11,
    certTitleFontSize: 11,
    certOffsetX: 0,
    certOffsetY: 0,
    certRowGap: 3,
};

// LETTER content width (612pt page minus 2 × 38pt content padding).
const CONTENT_WIDTH = 612 - 38 * 2;

// Letter page height — used by the page clamp. Kept 2pt under the nominal
// 792pt so a fractional rounding can never leave a blank second page.
const PAGE_HEIGHT = 790;

// Hard floor for auto-fit. When a value still can't fit at autoFitFloor it
// keeps shrinking down to this instead of wrapping and growing its fixed box.
const HARD_MIN = 3;

// Lowest the accordion's floor/auto-fit base is ever allowed to render at —
// matches the floor stepper's own UI minimum (4pt). Stops a stale or typed-in
// absurd value (e.g. 1pt from the earlier 2nd-page experiments) from blanking
// a field: the auto-fit *degrade* path for very long text may still dip below
// this down to HARD_MIN, but normal text never renders smaller than this.
const RENDER_FLOOR = 4;

export const TaxDeclarationPDF = ({
  data = {},
  orNumber = '',
  datePaid = '',
  certifiedByName = '',
  certifiedByTitle = '',
  spacing = {} as Partial<TDTemplateSpacing>,
}: any) => {
  const s: TDTemplateSpacing = { ...DEFAULT_TD_TEMPLATE_SPACING, ...spacing };
  const rows = data.assessmentRows || data.assessments || [];
  // Guaranteed 4 blank/underline rows
  const tableRows = [...rows, ...Array(Math.max(0, 4 - rows.length)).fill({})];

  const totalMarketValue = rows.reduce((sum: any, r: any) => sum + (Number(r.marketValue) || 0), 0);
  const totalAssessedValue = rows.reduce((sum: any, r: any) => sum + (Number(r.assessedValue) || 0), 0);

  // --- AUTO-FIT ----------------------------------------------------------
  // Fitted sizes are computed once fonts are ready; until then base sizes are
  // used so the first paint is never worse than today's output.
  const measureReady = useTextMeasureReady();
  const measure = (text: string, size: number, family = 'Times-Roman') =>
    measureReady ? measureTextWidth(text, family, size) : estimateWidth(text, size);

  // NOTE: the base size is clamped to the auto-fit floor (itself bounded by
  // RENDER_FLOOR). The floor is the smallest size the accordion is willing to
  // render at; setting a base below it (e.g. 1pt) would otherwise render
  // invisible text.
  const fitWidth = (text: string, maxWidth: number, family: string, base: number, weight: any = 'normal', style: any = 'normal') => {
    const floorEff = Math.max(s.autoFitFloor, RENDER_FLOOR);
    const effBase = Math.max(base, floorEff);
    return s.autoFitEnabled && measureReady
      ? fitFontSizeToWidth(text, maxWidth, family, { base: effBase, min: floorEff, absMin: HARD_MIN, weight, style })
      : effBase;
  };

  // Owner / Administrator + addresses — rendered at the user's chosen size and
  // allowed to WRAP to a second line when longer than the underline (no auto
  // shrink-to-fit, which is what shrank long values into the clipped "..." look);
  // the user adjusts the size manually. Guarded by RENDER_FLOOR so a stale tiny
  // value can never blank a field.
  const fontPt = (size: number) => Math.max(size, RENDER_FLOOR);

  const ownerNameSize = fontPt(s.ownerFontSize);
  const ownerAddressSize = fontPt(s.ownerFontSize);
  const adminNameSize = fontPt(s.ownerFontSize);
  const adminAddressSize = fontPt(s.ownerFontSize);

  // Location of property — three columns sharing the space after the label.
  const locationLabelW = Math.max(measure('Location of', 11), measure('Property:', 11));
  const locationColumnW = (CONTENT_WIDTH - locationLabelW - 4 - 30) / 3;

  const barangaySize = fitWidth(data.barangay || '', locationColumnW, 'BookmanOldStyle', s.locationFontSize, 'bold');
  const municipalitySize = fitWidth(data.municipality || '', locationColumnW, 'BookmanOldStyle', s.locationFontSize, 'bold');
  const provinceSize = fitWidth('ZAMBOANGA DEL NORTE', locationColumnW, 'Times-Bold', s.locationFontSize, 'bold');

  // Boundaries — each direction has its own size so the user can adjust them
  // independently; long values wrap instead of being shrunk or clipped.
  const boundaryNorthSize = fontPt(s.boundaryNorthFontSize);
  const boundarySouthSize = fontPt(s.boundarySouthFontSize);
  const boundaryEastSize = fontPt(s.boundaryEastFontSize);
  const boundaryWestSize = fontPt(s.boundaryWestFontSize);

  // Property table — Kind of Property (16%) and Classification (18%) cells.
  const kindCellW = CONTENT_WIDTH * 0.16 - 4;
  const classificationCellW = CONTENT_WIDTH * 0.18 - 4;

  // Amount in words — full flex underline after the label.
  const wordsW = CONTENT_WIDTH - measure('Total Assessed Value: ', 11) - 2;

  // Verified by / Assessor (each sits in a 32% column).
  const verifiedByW = CONTENT_WIDTH * 0.40 - 2;
  const assessorText = data.assessorName ? `(SGD.) ${data.assessorName}` : '';

  const verifiedByNameSize = fitWidth(data.verifiedByName || '', verifiedByW, 'BookmanOldStyle', s.assessorFontSize, 'bold');
  const assessorNameSize = fitWidth(assessorText, verifiedByW, 'BookmanOldStyle', s.assessorFontSize, 'bold');

  // Certified Copy block — signatory block is the 55% column minus the
  // "Certified copy:" label (85pt) and its right padding (10pt).
  const certSignatoryW = CONTENT_WIDTH * 0.65 - 60 - 10 - 2;

  const wordsSize = fitWidth(String(data.totalAssessedValueWords || ''), wordsW, 'BookmanOldStyle', s.amountWordsFontSize, 'bold', 'italic');
  const floorEff = Math.max(s.autoFitFloor, RENDER_FLOOR);
  const memorandaSize = s.autoFitEnabled && measureReady
    ? fitFontSizeToLines(
        data.memoranda || '',
        CONTENT_WIDTH - 65,
        3,
        'BookmanOldStyle',
        { base: Math.max(s.memorandaFontSize, floorEff), min: floorEff, absMin: HARD_MIN, weight: 'bold', style: 'italic' },
      )
    : Math.max(s.memorandaFontSize, floorEff);
  const certifiedNameSize = fitWidth(certifiedByName || '', certSignatoryW, 'BookmanOldStyle', s.certNameFontSize, 'bold');
  const certifiedTitleSize = fitWidth(certifiedByTitle || '', certSignatoryW, 'Times-Roman', s.certTitleFontSize);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.background} />

        {/* PAGE CLAMP: header + content sit inside a fixed-height, clipped
            container so the LETTER form can never spill onto a second page —
            any residual overflow is cut at the page edge instead. */}
        <View style={{ height: PAGE_HEIGHT, overflow: 'hidden' }}>
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
              <View style={{ width: '55%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11 }}>Owner: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: ownerNameSize, textAlign: 'center' }} hyphenationCallback={(word) => [word]}>
                    {data.ownerName || ''}
                  </Text>
                </View>
              </View>

              {/* Right: Owner Address */}
              <View style={{ width: '44%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10 }}>Address: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: ownerAddressSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
                    {data.ownerAddress || ''}
                  </Text>
                </View>
              </View>

            </View>

            {/* ROW 2: ADMINISTRATOR & ADDRESS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              
              {/* Left: Administrator */}
              <View style={{ width: '55%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11 }}>Administrator: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: adminNameSize, textAlign: 'center' }} hyphenationCallback={(word) => [word]}>
                    {data.administratorName || data.administrator_name || ''}
                  </Text>
                </View>
              </View>

              {/* Right: Admin Address */}
              <View style={{ width: '44%', flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11 }}>Address: </Text>
                <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: adminAddressSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
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
                  <Text style={[styles.locationLine, { fontSize: barangaySize }]}>{data.barangay}</Text>
                  <Text style={styles.locationSubLabel}>(Barangay)</Text>
                </View>

                {/* Municipality */}
                <View style={[styles.locationColumn, { marginRight: 15 }]}>
                  <Text style={[styles.locationLine, { fontSize: municipalitySize }]}>{data.municipality}</Text>
                  <Text style={styles.locationSubLabel}>(Municipality)</Text>
                </View>

                {/* Province */}
                <View style={styles.locationColumn}>
                  <Text style={[styles.locationLine, { fontFamily: 'Times-Bold', fontSize: provinceSize }]}>ZAMBOANGA DEL NORTE</Text>
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
                <View style={{ width: '49%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11 }}>Boundaries: </Text>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>North: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: boundaryNorthSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
                      {data.boundaryNorth}
                    </Text>
                  </View>
                </View>

                {/* Right Column: South */}
                <View style={{ width: '49%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>South: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: boundarySouthSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
                      {data.boundarySouth}
                    </Text>
                  </View>
                </View>

              </View>

              {/* ROW 2: EAST & WEST */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                
                {/* Left Column: East (Blank space spacer matching 'Boundaries: ') */}
                <View style={{ width: '49%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: 'transparent' }}>Boundaries: </Text>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>East: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: boundaryEastSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
                      {data.boundaryEast}
                    </Text>
                  </View>
                </View>

                {/* Right Column: West */}
                <View style={{ width: '49%', flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, width: 45, textAlign: 'right' }}>West: </Text>
                  
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: boundaryWestSize, textAlign: 'left' }} hyphenationCallback={(word) => [word]}>
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

            const kindSize = fitWidth(kind, kindCellW, 'BookmanOldStyle', s.tableFontSize, 'bold');
            const classSize = fitWidth(classification, classificationCellW, 'BookmanOldStyle', s.tableFontSize, 'bold');

            return (
              <View key={i} style={{ flexDirection: 'row', height: 18, alignItems: 'flex-end', justifyContent: 'flex-start', paddingLeft: 2, marginBottom: 0 }}>
                <View style={{ width: '16%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', justifyContent: 'flex-end', paddingBottom: 2 }}>
                  <Text style={{ textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: kindSize }}>{kind}</Text>
                </View>

                <View style={{ width: '18%', marginLeft: '1%', borderBottomWidth: 1, borderBottomColor: '#000', height: '100%', justifyContent: 'flex-end', paddingBottom: 2 }}>
                  <Text style={{ textAlign: 'center', fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: classSize }}>{classification}</Text>
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
              <Text style={{ fontSize: 10, fontFamily: 'Times-Bold', marginRight: 4 }}>TOTAL</Text>
            </View>
            <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 11 }}>P</Text>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(totalMarketValue)}</Text>
            </View>
            <View style={{ width: '12%', marginLeft: '4%', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Times-Bold', marginRight: 4 }}>TOTAL</Text>
            </View>
            <View style={{ width: '20%', marginLeft: '4%', borderBottomWidth: 1, borderBottomColor: '#000', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 11 }}>P</Text>
              <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 10 }}>{peso(totalAssessedValue)}</Text>
            </View>
          </View>

          {/* [1 space (font size 14)] */}
          <View style={{ height: 10 }} />

          {/* TOTAL ASSESSED VALUE & AMOUNT IN WORDS (No gap between them) */}
          <View style={styles.fieldRow}>
            <Text style={styles.label10}>Total Assessed Value: </Text>
            <View style={[styles.underlineData, { textAlign: 'left' }]}><Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontStyle: 'italic', fontSize: wordsSize }}>{String(data.totalAssessedValueWords || '')}</Text></View>
          </View>
          <Text style={{ fontSize: 10, textAlign: 'center' }}>(Amount in Words)</Text>

          {/* AREA & TAX EFFECTIVITY (No gap) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '25%' }}>
              <Text style={{ fontSize: 11 }}>Area: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', height: 14, overflow: 'hidden' }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11 }}>{formatArea(data.area)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '30%' }}>
              <Text style={{ fontSize: 11 }}>Tax Effectivity: </Text>
              <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'center', height: 14, overflow: 'hidden' }}>
                <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11 }}>{data.taxEffectivity}</Text>
              </View>
            </View>
          </View>

          {/* TAXABLE / EXEMPT (No gap) */}
          <View style={styles.fieldRow}>
            <Text style={{ fontSize: 11, marginRight: 20 }}>
                Taxable [ <Text style={{ fontFamily: 'Times-Bold' }}>{data.taxable ? 'X' : ' '}</Text> ]
            </Text>
            <Text style={{ fontSize: 11 }}>
                Exempt [ <Text style={{ fontFamily: 'Times-Bold' }}>{!data.taxable ? 'X' : ' '}</Text> ]
            </Text>
          </View>

          {/* [1 space (font size 8)] */}
          <View style={{ height: 8 }} />

          {/* VERIFIED BY & MUNICIPAL ASSESSOR */}
            <View>
              {/* Label */}
              <Text style={{ fontSize: 11, marginBottom: 2 }}>Verified by:</Text>

              {/* Signature Lines Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                
                {/* Left Column: Verified By Line */}
                <View style={{ width: '40%', marginLeft: 50 }}>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%', minHeight: 14, justifyContent: 'flex-end' }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: verifiedByNameSize, textAlign: 'center' }}>
                      {data.verifiedByName || ''}
                    </Text>
                  </View>
                </View>

                {/* Right Column: Municipal Assessor Line & Title */}
                <View style={{ width: '40%', alignItems: 'center', marginLeft: 60 }}>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: '100%', minHeight: 14, justifyContent: 'flex-end' }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: assessorNameSize, textAlign: 'center', marginLeft: s.assessorMarginLeft }}>
                      {assessorText}
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
            <View style={{ width: 100, borderBottomWidth: 1, borderBottomColor: '#000', textAlign: 'left', height: 14, overflow: 'hidden' }}>
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
              <View style={{ flex: 1, height: 45, maxHeight: 45, overflow: 'hidden' }}>
                <Text 
                  hyphenationCallback={(word) => [word]} 
                  style={{ 
                    fontFamily: 'BookmanOldStyle', 
                    fontWeight: 'bold', 
                    fontStyle: 'italic', 
                    fontSize: memorandaSize,
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
            <View style={{ height: 18 }} />

            <View style={styles.certifiedBox}>
              {/* LEFT COLUMN: Certified copy & Signatory */}
              <View style={{ width: '65%', flexDirection: 'row' }}>
                {/* Top-aligned label */}
                <Text style={{ width: 85, fontSize: 11 }}>Certified copy:</Text>

                {/* Signatory block pushed down to line up with O.R. No. */}
                <View style={{ flex: 1, alignItems: 'center', paddingRight: 10, marginTop: 12 + s.certOffsetY, transform: `translate(${s.certOffsetX}pt, 0pt)` }}>
                  <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: certifiedNameSize }}>
                    {certifiedByName}
                  </Text>
                  <Text style={{ fontSize: certifiedTitleSize, textAlign: 'center' }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: s.certRowGap }}>
                  <Text style={{ fontSize: 11 }}>Certification Fee: </Text>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', width: 75 }}>
                    <Text style={{ fontFamily: 'BookmanOldStyle', fontWeight: 'bold', fontSize: 11, textAlign: 'left' }}>
                      Php. 40.00
                    </Text>
                  </View>
                </View>

                {/* O.R. No. Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: s.certRowGap }}>
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
<View style={{ height: 8 }} />

{/* IMPORTANT TEXT — white bg + hanging indent, sits above the footer banner */}
<View style={{ 
  backgroundColor: 'white', 
  paddingVertical: 3,
  paddingHorizontal: 2,
  marginTop: 8,
}}>
  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <Text style={{ 
      fontSize: 11, 
      width: 78,
    }}>
      IMPORTANT:
    </Text>
    <Text style={{ 
      fontSize: 10, 
      flex: 1, 
      textAlign: 'justify',
    }}>
      This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should not be considered as title to the property.
    </Text>
  </View>
</View>

{/* [End spacer — clears the 200pt footer banner] */}
<View style={{ height: 40 }} />
          </View>
        </View>
      </Page>
    </Document>
  );
};