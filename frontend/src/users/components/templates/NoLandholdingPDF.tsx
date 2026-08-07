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
// ---------------------------------------------------------------------------
export interface NLHSpacing {
    sigMarginTop: number;
    sigBlockGap: number;
    sigBlockWidth: number;
    nameFontSize: number;
    titleFontSize: number;
    offsetX1: number;
    offsetX2: number;
    receiptBottom: number;
    receiptLeft: number;
    receiptRowGap: number;
    declarantPadding: number;
    declarantLetterSpacing: number;
    /** Space reserved at the bottom of EVERY page so text never runs into the
     *  footer background / "KUYOG TA" line. In points. 4cm ≈ 113pt. */
    footerClearance: number;
    /** Space reserved at the TOP of EVERY page (via the Page's own
     *  paddingTop). Page 1 cancels this out via a negative marginTop on the
     *  header image, so only continuation pages (2+) actually show the gap.
     *  IMPORTANT: this must NOT depend on `pageNumber` from a `render`
     *  callback — doing so creates a circular layout dependency in
     *  react-pdf (element size depends on pagination, pagination depends on
     *  element size) which causes unstable/duplicated content across pages. */
    continuationTopClearance: number;
}

export const DEFAULT_NLH_SPACING: NLHSpacing = {
    sigMarginTop: 80,
    sigBlockGap: 65,
    sigBlockWidth: 260,
    nameFontSize: 11,
    titleFontSize: 11,
    offsetX1: 0,
    offsetX2: 0,
    receiptBottom: 95,
    receiptLeft: 70,
    receiptRowGap: 3,
    declarantPadding: 1,
    declarantLetterSpacing: 0.3,
    footerClearance: 90,
    continuationTopClearance: 60,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Georgia',
        position: 'relative',
        fontSize: 12,
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
        // Changed from 'justify' -> 'left': justify was stretching the
        // spacing unevenly on short bold lines like "THIS IS TO CERTIFY".
        textAlign: 'left',
        marginBottom: 15,
        fontSize: 10,
        lineHeight: 1.5,
    },
    underlineText: {
        fontWeight: 'bold',
        textDecoration: 'underline',
        spacing: 0.3,
    },
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

    // --- Paper sizing — mirrors CertOfLandholdingPDF -------------------------
    const selectedPageSize: 'LETTER' | 'LEGAL' = paperSize || 'LETTER';

    const sp: NLHSpacing =
        selectedPageSize === 'LEGAL'
            ? { ...DEFAULT_NLH_SPACING, sigMarginTop: 180, ...spacing }
            : { ...DEFAULT_NLH_SPACING, ...spacing };

    // Page style reserves clearance on BOTH edges of EVERY page react-pdf
    // generates:
    //  - paddingBottom keeps text off the footer artwork / KUYOG TA band.
    //  - paddingTop reserves room at the top of continuation pages so text
    //    doesn't start flush against the header artwork. Page 1 cancels
    //    this out below via a negative marginTop on the header image, since
    //    the header image only renders once, at the very start of the flow.
    const pageStyle = {
        ...styles.page,
        paddingBottom: sp.footerClearance,
        paddingTop: sp.continuationTopClearance,
    };

    // Cancels the page-level paddingTop specifically where the header image
    // sits (start of document / page 1 only — this Image is not `fixed`,
    // so it never repeats on later pages).
    const headerImageStyle = {
        ...styles.headerImage,
        marginTop: -sp.continuationTopClearance,
    };

    const renderParagraph1 = () => {
        const sidePadding = '\u00A0'.repeat(sp.declarantPadding || 1);

        return (
            <Text style={styles.officialParagraph}>
                <Text>{INDENT}</Text>
                <Text style={{ fontWeight: 'bold' }}>THIS IS TO CERTIFY</Text>
                <Text> that </Text>
                <Text style={[
                    styles.underlineText,
                    { letterSpacing: sp.declarantLetterSpacing || 0 }
                ]}>
                    {`${sidePadding}${String(displayName)}${sidePadding}`}
                </Text>
                <Text> has/have no {propertyTerm} declared in {possessivePronoun} name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
            </Text>
        );
    };

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

    // Single <Page> — react-pdf's own flow engine decides how many physical
    // pages are needed. The `content` View wraps normally, and since both
    // paddingTop and paddingBottom now live on the Page itself (via
    // pageStyle), every generated page keeps the same clearance at top and
    // bottom — with no dependency on pageNumber, so pagination stays stable.
    return (
        <Document>
            <Page size={selectedPageSize} style={pageStyle}>
                <Image src={window.location.origin + '/images/landholding_header.png'} style={headerImageStyle} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>
                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>
                    {renderParagraph1()}
                    {renderParagraph2()}
                    {renderSignatories()}
                </View>

                {renderReceipt()}
                <Text
                    style={styles.pageNumber}
                    fixed
                    render={({ pageNumber, totalPages }) =>
                        totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ''
                    }
                />
            </Page>
        </Document>
    );
};