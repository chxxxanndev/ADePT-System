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
    paperSize?: 'LETTER' | 'LEGAL'; // 👈 Added optional paper size prop
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
        paperSize = 'LETTER', // 👈 Default to LETTER
        signatory1Name = 'ELVIRA T. ENAO, REA',
        signatory1Title = 'Local Assessment Operations Officer IV',
        signatory2Name = 'ENGR. FLORIPES R. BAEL, REA, REB',
        signatory2Title = 'Local Assessment Operations Officer IV',
        request,
        spacing,
    } = props;

    // Adjust default signatory top margin dynamically if switching to LEGAL
    // (Legal page height is ~216pt longer than Letter)
    const dynamicDefaults: NLHSpacing = {
        ...DEFAULT_NLH_SPACING,
        sigMarginTop: paperSize === 'LEGAL' ? 180 : DEFAULT_NLH_SPACING.sigMarginTop,
    };

    // Merge caller overrides with defaults — every sp.* reference below is
    // guaranteed to be a number, so no undefined can slip into @react-pdf styles.
    const sp: NLHSpacing = { ...dynamicDefaults, ...spacing };

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

    return (
        <Document>
            <Page size={paperSize} style={styles.page}>
                {/* Header & Background */}
                <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>

                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                    {/* Paragraph 1 */}
                    <Text style={styles.officialParagraph}>
                        <Text>{INDENT}</Text>
                        <Text style={{ fontWeight: 'bold' }}>THIS IS TO CERTIFY</Text>
                        <Text> that </Text>
                        <Text style={styles.underlineText}>{String(displayName)}</Text>
                        <Text> has/have no {propertyTerm} declared in {possessivePronoun} name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
                    </Text>

                    {/* Paragraph 2 */}
                    <Text style={styles.officialParagraph}>
                        <Text>{INDENT}</Text>
                        <Text>Given this </Text>
                        <Text style={styles.underlineText}>{displayDay ? getOrdinalSuffix(displayDay) : '____'}</Text>
                        <Text> day of </Text>
                        <Text style={styles.underlineText}>{displayMonthYear || '________________'}</Text>
                        <Text>, at {given_at} for {purpose || 'whatever legal purpose/intent it may serve best'}.</Text>
                    </Text>

                    {/* Signatories */}
                    <View style={[styles.signatoryContainer, { marginTop: sp.sigMarginTop }]}>

                        {/* Signatory 1 */}
                            <View style={[
                                styles.signatoryBlock,
                                {
                                    marginBottom: sp.sigBlockGap,
                                    width: sp.sigBlockWidth,
                                    transform: `translate(${sp.offsetX1}pt, 0pt)`,  // ← fix
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
                                    transform: `translate(${sp.offsetX2}pt, 0pt)`,  // ← fix
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
                </View>

                {/* Receipt Box */}
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
            </Page>
        </Document>
    );
};