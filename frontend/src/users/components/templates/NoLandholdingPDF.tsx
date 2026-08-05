import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Register Georgia Font
Font.register({
  family: 'Georgia',
  fonts: [
    { src: window.location.origin + '/fonts/georgia.ttf' },
    { src: window.location.origin + '/fonts/georgiab.ttf', fontWeight: 'bold' }
  ]
});

// Helper function to convert numeric day into ordinal form (e.g., 29 -> 29th)
const getOrdinalSuffix = (dayInput: string | number) => {
    const num = parseInt(String(dayInput), 10);
    if (isNaN(num)) return dayInput;

    const j = num % 10;
    const k = num % 100;

    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;
    return `${num}th`;
};

// ---------------------------------------------------------------------------
// NLH Spacing — all layout values that staff may need to nudge per-document.
// Defined and exported here so DocumentReleasePanel can import the type and
// default without a separate shared file.
// ---------------------------------------------------------------------------
export interface NLHSpacing {
    sigMarginTop: number;      // space above the whole signatory block (was 80)
    sigBlockGap: number;       // gap between signatory 1 and signatory 2 (was 60)
    sigBlockWidth: number;     // width of each signatory block in pt (was 260)
    nameFontSize: number;      // signatory name font size (was 11)
    titleFontSize: number;     // signatory title font size (was 10)
    offsetX1: number;          // horizontal nudge for sig1 block — negative = left (was 0)
    offsetX2: number;          // horizontal nudge for sig2 block — negative = left (was 0)
    receiptBottom: number;     // absolute bottom position of receipt box (was 95)
    receiptLeft: number;       // absolute left position of receipt box (was 70)
    receiptRowGap: number;     // marginBottom between Cert Fee / O.R. No. / Dated rows (was 3)
}

export const DEFAULT_NLH_SPACING: NLHSpacing = {
    sigMarginTop: 80,
    sigBlockGap: 60,
    sigBlockWidth: 260,
    nameFontSize: 11,
    titleFontSize: 10,
    offsetX1: 0,
    offsetX2: 0,
    receiptBottom: 95,
    receiptLeft: 70,
    receiptRowGap: 3,
};

// -------------------
// Paper sizing & pagination
// ---------------------------------------------------------------------------
// Both LETTER and LEGAL share the same width (612pt), so only the height
// differs. The template auto-switches to LEGAL the moment the estimated
// content no longer fits LETTER, and spills onto a second page (mirroring
// the Landholding certificate) when it no longer fits LEGAL either.
const PAGE_WIDTH = 612;
const LETTER_HEIGHT = 792;
const LEGAL_HEIGHT = 1008;
const CONTENT_PADDING_X = 70;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_PADDING_X * 2; // 472
// Georgia is a wide serif, so average glyph width is ~0.65× the font size.
// Using a slightly generous factor yields conservative (rounded-up) line
// counts so the fit check never underestimates how tall the text runs.
const AVG_CHAR_WIDTH_FACTOR = 0.65;
const FIT_BUFFER = 30; // pt of slack added to every fit check
const HEADER_HEIGHT = PAGE_WIDTH * (438 / 2481); // landholding_header.png ratio

// ---------------------------------------------------------------------------
// Styles — static values only. Dynamic layout overrides are applied inline
// via the `sp` object derived from the spacing prop below.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Georgia',
        position: 'relative',
        fontSize: 10,
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
        height: 'auto',
        zIndex: -1,
    },
    content: {
        paddingHorizontal: 70,
        paddingTop: 5,
        paddingBottom: 40,
    },
    title: {
        fontSize: 23,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 35,
        marginBottom: 50,
    },
    salutation: {
        fontWeight: 'bold',
        marginBottom: 40,
        fontSize: 10,
        marginLeft: 0,
    },
    officialParagraph: {
        textAlign: 'justify',
        marginBottom: 15,
        fontSize: 10,
        lineHeight: 1.5,
    },
    underlineText: {
        fontWeight: 'bold',
        textDecoration: 'underline',
    },
    // Base signatory styles — marginTop / marginBottom / width / fontSize are
    // overridden inline from sp so they can be nudged without a PDF rebuild.
    signatoryContainer: {
        width: '100%',
        alignItems: 'flex-end',
    },
    signatoryBlock: {
        textAlign: 'center',
    },
    signatoryName: {
        fontWeight: 'bold',
    },
    // Base receipt styles — bottom / left / marginBottom overridden inline.
    receiptContainer: {
        position: 'absolute',
        width: 180,
    },
    receiptRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    receiptLabel: { width: 60, fontSize: 10 },
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CertOfNoLandholdingPDFProps {
    declarant_name?: string;
    ownerName?: string;
    pronoun?: string;
    property_count?: string;
    date_given?: string;
    given_at?: string;
    purpose?: string;
    day?: string | number;
    monthYear?: string;
    orNumber?: string;
    datePaid?: string;
    certFee?: string;
    spacing?: Partial<NLHSpacing>;
    // Optional hard override. When omitted, the template auto-picks LETTER,
    // and switches to LEGAL once the content stops fitting the short size.
    paperSize?: 'LETTER' | 'LEGAL';
    signatory1Name?: string;
    signatory1Title?: string;
    signatory2Name?: string;
    signatory2Title?: string;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const CertOfNoLandholdingPDF = (props: CertOfNoLandholdingPDFProps) => {
    const {
        declarant_name,
        ownerName,
        pronoun = 'His',
        property_count = 'singular',
        date_given,
        given_at = 'Dipolog City',
        purpose,
        day,
        monthYear,
        orNumber,
        datePaid,
        certFee = '40.00',
        paperSize,
        signatory1Name = 'ELVIRA T. ENAO, REA',
        signatory1Title = 'Local Assessment Operations Officer IV',
        signatory2Name = 'ENGR. FLORIPES R. BAEL, REA, REB',
        signatory2Title = 'Local Assessment Operations Officer IV',
        request,
        spacing,
    } = props;

    const INDENT = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

    // 1. Resolve Declarant Name
    const displayName = declarant_name || ownerName || request?.requested_by_name || '';

    // 2. Resolve Payment Metadata
    const finalOrNumber = orNumber || request?.or_number || '';
    const finalDatePaid = datePaid || request?.payment_date || '';

    // 3. Resolve Grammar & Pronouns
    const pronounLower = pronoun.toLowerCase();
    const possessivePronoun =
        pronounLower === 'his' ? 'his' :
        pronounLower === 'her' ? 'her' : 'their';
    const propertyTerm = property_count === 'plural' ? 'real properties' : 'real property';

    // 4. Resolve Date Formatting (Given Date)
    let displayDay: string | number = day || '';
    let displayMonthYear = monthYear || '';

    if (date_given && (!day || !monthYear)) {
        const parsedDate = new Date(date_given);
        if (!isNaN(parsedDate.getTime())) {
            displayDay = parsedDate.getDate();
            displayMonthYear = `${parsedDate.toLocaleString('en-US', { month: 'long' })}, ${parsedDate.getFullYear()}`;
        }
    }

    // 5. Resolve Signatories
    const activeSignatory1Name = signatory1Name || request?.signatoryDetails?.name || 'ELVIRA T. ENAO, REA';
    const activeSignatory1Title = signatory1Title || request?.signatoryDetails?.title || 'Local Assessment Operations Officer IV';

    // --- Paper auto-sizing ---------------------------------------------------
    // The signatory-top default sits higher on LEGAL (Legal is ~216pt taller
    // than Letter), so each candidate size gets its own merged spacing set.
    const letterSp: NLHSpacing = { ...DEFAULT_NLH_SPACING, ...spacing };
    const legalSp: NLHSpacing = {
        ...DEFAULT_NLH_SPACING,
        sigMarginTop: 180,
        ...spacing,
    };

    // Conservative text-height estimate — counts wrapped lines, never fewer
    // than the layout really needs.
    const estimateLines = (text: string, lineWidth: number, fontSize: number): number => {
        const charsPerLine = Math.max(1, Math.floor(lineWidth / (fontSize * AVG_CHAR_WIDTH_FACTOR)));
        return Math.max(1, Math.ceil(text.length / charsPerLine));
    };

    const para1Text =
        `${INDENT}THIS IS TO CERTIFY that \u00A0${displayName}\u00A0${displayName} ` +
        `has/have no ${propertyTerm} declared in ${possessivePronoun} name/s either singly or ` +
        `collectively within the taxing jurisdiction of this province per office records.`;

    const para2Text =
        `${INDENT}Given this ${displayDay ? getOrdinalSuffix(displayDay) : '____'} day of ` +
        `${displayMonthYear || '________________'}, at ${given_at} for ` +
        `${purpose || 'whatever legal purpose/intent it may serve best'}.`;

    // Header + content padding + title + salutation + both paragraphs + bottom
    // padding. Independent of the signatory spacing (shared by both sizes).
    const bodyHeight =
        HEADER_HEIGHT +
        5 + // content paddingTop
        (35 + 23 * 1.2 + 50) + // title marginTop + text + marginBottom
        (10 * 1.2 + 40) + // salutation text + marginBottom
        (estimateLines(para1Text, CONTENT_WIDTH, 10) * 10 * 1.5 + 15) + // paragraph 1
        (estimateLines(para2Text, CONTENT_WIDTH, 10) * 10 * 1.5 + 15) + // paragraph 2
        40; // content paddingBottom

    const estimateSigBlockHeight = (s: NLHSpacing): number => {
        const sig1H =
            estimateLines(activeSignatory1Name, s.sigBlockWidth, s.nameFontSize) * s.nameFontSize * 1.2 +
            estimateLines(activeSignatory1Title, s.sigBlockWidth, s.titleFontSize) * s.titleFontSize * 1.2;
        const sig2H = signatory2Name
            ? estimateLines(signatory2Name, s.sigBlockWidth, s.nameFontSize) * s.nameFontSize * 1.2 +
              estimateLines(signatory2Title, s.sigBlockWidth, s.titleFontSize) * s.titleFontSize * 1.2
            : 0;
        return s.sigMarginTop + sig1H + s.sigBlockGap + sig2H;
    };

    const letterHeight = bodyHeight + estimateSigBlockHeight(letterSp);
    const legalHeight = bodyHeight + estimateSigBlockHeight(legalSp);

    // Explicit paperSize overrides auto-detection; otherwise auto-switch to
    // LEGAL the moment the content stops fitting the short (LETTER) size.
    const selectedPageSize: 'LETTER' | 'LEGAL' =
        paperSize || (letterHeight + FIT_BUFFER <= LETTER_HEIGHT ? 'LETTER' : 'LEGAL');

    const sp: NLHSpacing = selectedPageSize === 'LEGAL' ? legalSp : letterSp;
    const pageHeight = selectedPageSize === 'LEGAL' ? LEGAL_HEIGHT : LETTER_HEIGHT;
    const totalHeight = selectedPageSize === 'LEGAL' ? legalHeight : letterHeight;
    // Once even the legal size can't hold everything, flow onto a second page
    // exactly like the landholding certificate (closing block on last page).
    const needsSecondPage = totalHeight + FIT_BUFFER > pageHeight;

    const renderParagraph1 = () => (
        <Text style={styles.officialParagraph}>
            <Text>{INDENT}</Text>
            <Text style={{ fontWeight: 'bold' }}>THIS IS TO CERTIFY</Text>
            <Text> that </Text>
            <Text style={styles.underlineText}>
    {`\u00A0${String(displayName)}\u00A0`}
  </Text>
            <Text style={styles.underlineText}>{String(displayName)}</Text>
            <Text> has/have no {propertyTerm} declared in {possessivePronoun} name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
        </Text>
    );

    const renderParagraph2 = () => (
        <Text style={styles.officialParagraph}>
            <Text>{INDENT}</Text>
            <Text>Given this </Text>
            <Text style={styles.underlineText}>{displayDay ? getOrdinalSuffix(displayDay) : '____'}</Text>
            <Text> day of </Text>
            <Text style={styles.underlineText}>{displayMonthYear || '________________'}</Text>
            <Text>, at {given_at} for {purpose || 'whatever legal purpose/intent it may serve best'}.</Text>
        </Text>
    );

    const renderSignatories = () => (
        <View style={[styles.signatoryContainer, { marginTop: sp.sigMarginTop }]}>
            {/* Signatory 1 */}
            <View style={[
                styles.signatoryBlock,
                {
                    marginBottom: sp.sigBlockGap,
                    width: sp.sigBlockWidth,
                    transform: `translate(${sp.offsetX1}pt, 0pt)`,
                }
            ]}>
                <Text style={[styles.signatoryName, { fontSize: sp.nameFontSize }]}>
                    {activeSignatory1Name}
                </Text>
                <Text style={{ fontSize: sp.titleFontSize }}>
                    {activeSignatory1Title}
                </Text>
            </View>

            {/* Signatory 2 — only rendered when a second name is provided */}
            {signatory2Name && (
                <View style={[
                    styles.signatoryBlock,
                    {
                        marginBottom: 0,
                        width: sp.sigBlockWidth,
                        transform: `translate(${sp.offsetX2}pt, 0pt)`,
                    }
                ]}>
                    <Text style={[styles.signatoryName, { fontSize: sp.nameFontSize }]}>
                        {signatory2Name}
                    </Text>
                    <Text style={{ fontSize: sp.titleFontSize }}>
                        {signatory2Title}
                    </Text>
                </View>
            )}
        </View>
    );

    const renderReceipt = () => (
        <View style={[
            styles.receiptContainer,
            {
                bottom: sp.receiptBottom,
                left: sp.receiptLeft,
            }
        ]}>
            <View style={[styles.receiptRow, { marginBottom: sp.receiptRowGap }]}>
                <Text style={styles.receiptLabel}>Cert. Fee</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                <Text style={styles.receiptValue}>Php. {certFee}</Text>
            </View>
            <View style={[styles.receiptRow, { marginBottom: sp.receiptRowGap }]}>
                <Text style={styles.receiptLabel}>O.R. No.</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                <Text style={styles.receiptValue}>{finalOrNumber}</Text>
            </View>
            <View style={[styles.receiptRow, { marginBottom: 0 }]}>
                <Text style={styles.receiptLabel}>Dated</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                <Text style={styles.receiptValue}>{finalDatePaid}</Text>
            </View>
        </View>
    );

    // Single page — every element on one page, no page number needed.
    if (!needsSecondPage) {
        return (
            <Document>
                <Page size={selectedPageSize} style={styles.page}>
                    <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                    <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                    <View style={styles.content}>
                        <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>
                        <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>
                        {renderParagraph1()}
                        {renderParagraph2()}
                        {renderSignatories()}
                    </View>

                    {renderReceipt()}
                </Page>
            </Document>
        );
    }

    // Two pages — mirrors the landholding certificate: page 1 holds the
    // opening (title, salutation, certify paragraph), the continuation page
    // holds the "Given this day..." closing, the signatories and the receipt.
    // Page numbers appear on every page only when the document is 2+ pages.
    return (
        <Document>
            <Page size={selectedPageSize} style={styles.page}>
                <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>
                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>
                    {renderParagraph1()}
                </View>

                <Text style={styles.pageNumber}>{`Page 1 of 2`}</Text>
            </Page>

            <Page size={selectedPageSize} style={styles.page}>
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={[styles.content, { paddingTop: 70 }]}>
                    {renderParagraph2()}
                    {renderSignatories()}
                </View>

                {renderReceipt()}
                <Text style={styles.pageNumber}>{`Page 2 of 2`}</Text>
            </Page>
        </Document>
    );
};