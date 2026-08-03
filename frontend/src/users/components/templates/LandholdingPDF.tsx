import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

// Register Georgia Font
Font.register({
  family: 'Georgia',
  fonts: [
    { src: `${getBaseUrl()}/fonts/georgia.ttf` },
    { src: `${getBaseUrl()}/fonts/georgiab.ttf`, fontWeight: 'bold' }
  ]
});

// Helper to return day number and suffix separately for styling
const getOrdinalSuffixParts = (dayInput: string | number) => {
  const num = parseInt(String(dayInput), 10);
  if (isNaN(num)) return { number: String(dayInput), suffix: '' };

  const j = num % 10;
  const k = num % 100;

  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';

  return { number: String(num), suffix };
};

const formatCurrency = (value: string | number) => {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Pagination ------------------------------------------------------------
// A page holds at most this many property rows. Once the table exceeds this,
// the remaining rows flow onto a new page, which repeats the header image,
// the background art, and the column headers. Only the LAST page carries the
// "Given this day..." paragraph, the signatories, and the receipt block.
const ROWS_PER_PAGE = 15;

// Default column widths (must add up to ~100). Adjustable per-document via
// the `colWidths` prop (wired to the sidebar steppers in the release panel).
const DEFAULT_COL_WIDTHS = {
  td: 18,
  location: 26,
  lot: 12,
  title: 12,
  area: 14,
  assessed: 18,
};

type ColWidths = typeof DEFAULT_COL_WIDTHS;

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Georgia',
    position: 'relative',
    fontSize: 12,
    lineHeight: 1.2,
  },
  headerImage: {
    width: '100%',
    height: 'auto',
  },
  bottomBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 200,
    objectFit: 'cover',
    zIndex: -1,
  },
  content: {
    paddingHorizontal: 50,
    paddingTop: 15,
    paddingBottom: 40,
  },
  title: {
    fontSize: 23,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 50,
  },
  salutation: {
    fontWeight: 'bold',
    marginBottom: 40,
    fontSize: 11,
    marginLeft: 30,
  },
  officialParagraph: {
    textAlign: 'justify',
    marginBottom: 5,
    fontSize: 11,
    lineHeight: 1.5,
  },
  underlineText: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    letterSpacing: 0.1,
  },
  table: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
    borderTopWidth: 0.75,
    borderLeftWidth: 0.75,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 22,
    alignItems: 'stretch',
    borderBottomWidth: 0.75,
    borderColor: '#000',
  },
  cell: {
    borderRightWidth: 0.75,
    borderColor: '#000',
    padding: 3,
    justifyContent: 'center',
  },
  thText: {
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center'
  },
  tdText: {
    fontSize: 9,
    fontWeight: 'normal',
    textAlign: 'center',
  },
  signatoryContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
  signatoryBlock: {
    textAlign: 'center',
    width: 250,
  },
  signatoryName: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  receiptContainer: {
    position: 'absolute',
    width: 150,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  receiptLabel: { width: 55, fontSize: 10 },
  receiptValue: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingLeft: 5,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#444',
  },
});

interface CertOfLandholdingPDFProps {
  declarant_name?: string;
  ownerName?: string;
  properties?: any[];
  date_given?: string;
  day?: string | number;
  monthYear?: string;
  orNumber?: string;
  datePaid?: string;
  certFee?: string;
  signatory1Name?: string;
  signatory1Title?: string;
  signatory2Name?: string;
  signatory2Title?: string;
  signatoryTopSpacing?: number;
  signatoryGapSpacing?: number;
  // --- Signatory text sizing / block width — lets staff shrink the font or
  // widen the block when a name/title is too long to fit on one line at the
  // default size. Applies uniformly to both signatory blocks, same pattern
  // as signatoryTopSpacing/signatoryGapSpacing above. ---
  signatoryNameFontSize?: number;
  signatoryTitleFontSize?: number;
  signatoryBlockWidth?: number;
  // Per-signatory horizontal nudge (pt). Moves the whole block — name AND
  // title together — left (negative) or right (positive) of its default
  // right-aligned position. Independent per signatory.
  signatory1HorizontalOffset?: number;
  signatory2HorizontalOffset?: number;
  receiptBottomPosition?: number;
  receiptLeftPosition?: number;
  receiptRowSpacing?: number;
  // --- Table layout (rows / columns / text size) — all live-adjustable ---
  tableRowHeight?: number;
  tableFontSize?: number;
  tableHeaderFontSize?: number;
  colWidths?: Partial<ColWidths>;
  paperSizeOverride?: string;
  request?: {
    or_number?: string;
    payment_date?: string;
    requested_by_name?: string;
    signatoryDetails?: {
      name?: string;
      title?: string;
    };
  };
}

export const CertOfLandholdingPDF = (props: CertOfLandholdingPDFProps) => {
  const {
    declarant_name,
    ownerName,
    properties = [],
    date_given,
    day,
    monthYear,
    orNumber,
    datePaid,
    certFee = '40.00',
    signatory1Name,
    signatory1Title,
    signatory2Name = 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    signatory2Title = 'Assistant Provincial Assessor',
    signatoryTopSpacing = 60,
    signatoryGapSpacing = 65,
    signatoryNameFontSize = 11,
    signatoryTitleFontSize = 11,
    signatoryBlockWidth = 250,
    signatory1HorizontalOffset = 0,
    signatory2HorizontalOffset = 0,
    receiptBottomPosition = 100,
    receiptLeftPosition = 80,
    receiptRowSpacing = 2,
    tableRowHeight = 22,
    tableFontSize = 9,
    tableHeaderFontSize = 10,
    colWidths,
    paperSizeOverride,
    request
  } = props;

  const widths: ColWidths = { ...DEFAULT_COL_WIDTHS, ...(colWidths || {}) };

  const displayName = declarant_name || ownerName || request?.requested_by_name || '';
  const finalOrNumber = orNumber || request?.or_number || '';
  const finalDatePaid = datePaid || request?.payment_date || '';

  const activeSignatory1Name = signatory1Name || request?.signatoryDetails?.name || 'ELVIRA T. ENAO, REA';
  const activeSignatory1Title = signatory1Title || request?.signatoryDetails?.title || 'Municipal Assessor';

  let displayDay = day || '';
  let displayMonthYear = monthYear || '';

  if (date_given && (!day || !monthYear)) {
    const parsedDate = new Date(date_given);
    if (!isNaN(parsedDate.getTime())) {
      displayDay = parsedDate.getDate();
      displayMonthYear = `${parsedDate.toLocaleString('en-US', { month: 'long' })}, ${parsedDate.getFullYear()}`;
    }
  }

  // Page size is still picked off the *total* property count, so a
  // multi-page certificate stays consistent across all of its pages rather
  // than switching paper size mid-document.
  const selectedPageSize = paperSizeOverride || (properties.length > 4 ? 'LEGAL' : 'LETTER');
  const INDENT = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

  const dayParts = displayDay ? getOrdinalSuffixParts(displayDay) : null;

  // --- Split properties into pages of ROWS_PER_PAGE ------------------------
  const pages: any[][] = [];
  for (let i = 0; i < properties.length; i += ROWS_PER_PAGE) {
    pages.push(properties.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]); // always render at least one page
  const totalPages = pages.length;

  const renderTableHeader = () => (
    <View style={styles.tableRow}>
      <View style={[styles.cell, { width: `${widths.td}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>TD/ARP No.</Text>
      </View>
      <View style={[styles.cell, { width: `${widths.location}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>Location of Prop.</Text>
      </View>
      <View style={[styles.cell, { width: `${widths.lot}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>Lot No.</Text>
      </View>
      <View style={[styles.cell, { width: `${widths.title}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>Title No.</Text>
      </View>
      <View style={[styles.cell, { width: `${widths.area}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>Area</Text>
      </View>
      <View style={[styles.cell, { width: `${widths.assessed}%` }]}>
        <Text style={[styles.thText, { fontSize: tableHeaderFontSize }]}>Assd. Value</Text>
      </View>
    </View>
  );

  return (
    <Document>
      {pages.map((pageProperties, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;
        const rowOffset = pageIndex * ROWS_PER_PAGE;

        return (
          <Page key={pageIndex} size={selectedPageSize as any} style={styles.page}>
            {/* Header/logo image only on the first page — continuation
                pages skip it per request. Background art still repeats
                on every page. */}
            {isFirstPage && (
                <Image src={`${getBaseUrl()}/images/landholding_header.png`} style={styles.headerImage} />
            )}
            <Image fixed src={`${getBaseUrl()}/images/landholding_bg.png`} style={styles.bottomBackground} />

            <View style={[styles.content, !isFirstPage ? { paddingTop: 70 } : {}]}>
              {isFirstPage && (
                <>
                  <Text style={styles.title}>CERTIFICATE OF LANDHOLDING</Text>
                  <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                  <Text style={styles.officialParagraph}>
  <Text>{INDENT}</Text>
  <Text style={{ fontWeight: 'bold' }}>THIS IS TO CERTIFY</Text>
  <Text> that </Text>
  {/* Added \u00A0 (non-breaking space) before and after the name */}
  <Text style={styles.underlineText}>
    {`\u00A0${String(displayName)}\u00A0`}
  </Text>
  <Text>, is/are the declared owner/s of real property/properties described hereunder within the taxing jurisdiction of this province.</Text>
</Text>
                </>
              )}

              <View style={styles.table}>
                {renderTableHeader()}

                {pageProperties.map((prop: any, index: number) => {
                  const td = prop.tdArpNumber || prop.td_arp_number || prop.tdNo || prop.td_number || '';
                  const loc = prop.locationOfProperty || prop.location_of_property || prop.location || prop.property_location || prop.propertyLocation || '';
                  const lot = prop.lotNumber || prop.lot_number || prop.lotNo || '';
                  const title = prop.titleNumber || prop.title_number || prop.titleNo || '';
                  const areaVal = prop.area || prop.areaSqM || '';
                  const assd = prop.assessedValue || prop.assessed_value || prop.assdValue || '';

                  return (
                    <View key={rowOffset + index} style={[styles.tableRow, { minHeight: tableRowHeight }]} wrap={false}>
                      <View style={[styles.cell, { width: `${widths.td}%`, alignItems: 'center' }]}>
                        <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{td}</Text>
                      </View>
                      <View style={[styles.cell, { width: `${widths.location}%`, alignItems: 'center', paddingHorizontal: 2 }]}>
                        <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{loc}</Text>
                      </View>
                      <View style={[styles.cell, { width: `${widths.lot}%`, alignItems: 'center' }]}>
                        <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{lot}</Text>
                      </View>
                      <View style={[styles.cell, { width: `${widths.title}%`, alignItems: 'center' }]}>
                        <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{title}</Text>
                      </View>
                      <View style={[styles.cell, { width: `${widths.area}%`, alignItems: 'center' }]}>
                        <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{areaVal}</Text>
                      </View>
                      <View style={[styles.cell, { width: `${widths.assessed}%`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }]}>
                        {assd !== '' && (
                          <>
                            <Text style={[styles.tdText, { fontSize: tableFontSize }]}>PHP</Text>
                            <Text style={[styles.tdText, { fontSize: tableFontSize }]}>{formatCurrency(assd)}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {isLastPage && (
                <>
                  <Text style={styles.officialParagraph}>
                    <Text>{INDENT}</Text>
                    <Text>Given this </Text>
                    {dayParts ? (
                      <Text style={styles.underlineText}>
                        {dayParts.number}
                        <Text style={{ fontSize: 7 }}>{dayParts.suffix}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.underlineText}>____</Text>
                    )}
                    <Text> day of </Text>
                    <Text style={styles.underlineText}>{displayMonthYear || '________________'}</Text>
                    <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
                  </Text>

                  <View style={[styles.signatoryContainer, { marginTop: signatoryTopSpacing }]}>
                    <View style={[
                      styles.signatoryBlock,
                      {
                        marginBottom: signatoryGapSpacing,
                        width: signatoryBlockWidth,
                        transform: `translateX(${signatory1HorizontalOffset}px)`,
                      },
                    ]}>
                      <Text style={[styles.signatoryName, { fontSize: signatoryNameFontSize }]}>{activeSignatory1Name}</Text>
                      <Text style={{ fontSize: signatoryTitleFontSize }}>{activeSignatory1Title}</Text>
                    </View>
                    {signatory2Name && (
                      <View style={[
                        styles.signatoryBlock,
                        {
                          width: signatoryBlockWidth,
                          transform: `translateX(${signatory2HorizontalOffset}px)`,
                        },
                      ]}>
                        <Text style={[styles.signatoryName, { fontSize: signatoryNameFontSize }]}>{signatory2Name}</Text>
                        <Text style={{ fontSize: signatoryTitleFontSize }}>{signatory2Title}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>

            {isLastPage && (
              <View style={[styles.receiptContainer, { bottom: receiptBottomPosition, left: receiptLeftPosition }]}>
                <View style={[styles.receiptRow, { marginBottom: receiptRowSpacing }]}>
                  <Text style={styles.receiptLabel}>Cert. Fee</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                  <Text style={styles.receiptValue}>Php. {certFee}</Text>
                </View>
                <View style={[styles.receiptRow, { marginBottom: receiptRowSpacing }]}>
                  <Text style={styles.receiptLabel}>O.R. No.</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                  <Text style={styles.receiptValue}>{finalOrNumber}</Text>
                </View>
                <View style={[styles.receiptRow, { marginBottom: receiptRowSpacing }]}>
                  <Text style={styles.receiptLabel}>Dated</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                  <Text style={styles.receiptValue}>{finalDatePaid}</Text>
                </View>
              </View>
            )}

            {/* Page number — sits in the same footer band between the
                receipt block and the signature block, repeated on every
                page so multi-page certs are easy to keep in order. We
                already know pageIndex/totalPages ourselves (we built the
                `pages` array), so this is a plain computed string rather
                than react-pdf's render+fixed API — that API is for content
                that overflows a *single* <Page> into multiple physical
                pages automatically; here we're building explicit <Page>
                elements ourselves, so render+fixed never fires. */}
            {totalPages > 1 && (
  <Text style={styles.pageNumber}>{`Page ${pageIndex + 1} of ${totalPages}`}</Text>
)}
          </Page>
        );
      })}
    </Document>
  );
};