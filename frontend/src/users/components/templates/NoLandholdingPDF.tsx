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
        fontSize: 14,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 35,
        marginBottom: 40,
    },
    salutation: {
        fontWeight: 'bold',
        marginBottom: 35,
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
    // Signatories Block (Adjusted margins to prevent pushing down too far)
    signatoryContainer: {
        marginTop: 35,
        width: '100%',
        alignItems: 'flex-end',
    },
    signatoryBlock: {
        marginBottom: 35,
        textAlign: 'center',
        width: 260,
    },
    signatoryName: {
        fontWeight: 'bold',
        fontSize: 11,
    },
    // Receipt Section
    receiptContainer: {
        position: 'absolute',
        bottom: 95,
        left: 70,
        width: 180,
    },
    receiptRow: {
        flexDirection: 'row',
        marginBottom: 3,
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

export const CertOfNoLandholdingPDF = ({
    ownerName = '',
    day = '',
    monthYear = '',
    orNumber = '',
    datePaid = '',
    certFee = '40.00',
    signatory1Name = 'ELVIRA T. ENAO, REA',
    signatory1Title = 'Local Assessment Operations Officer IV',
    signatory2Name = 'ENGR. FLORIPES R. BAEL, REA, REB',
    signatory2Title = 'Local Assessment Operations Officer IV'
}: any) => {

    const INDENT = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
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
                        <Text style={styles.underlineText}>{String(ownerName).toUpperCase()}</Text>
                        <Text> has/have no real property/properties declared in his/her/their name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
                    </Text>

                    {/* Paragraph 2 */}
                    <Text style={styles.officialParagraph}>
                        <Text>{INDENT}</Text>
                        <Text>Given this </Text>
                        <Text style={styles.underlineText}>{getOrdinalSuffix(day)}</Text>
                        <Text> day of </Text>
                        <Text style={styles.underlineText}>{monthYear}</Text>
                        <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
                    </Text>

                    {/* Signatories */}
                    <View style={styles.signatoryContainer}>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory1Name}</Text>
                            <Text style={{ fontSize: 10 }}>{signatory1Title}</Text>
                        </View>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory2Name}</Text>
                            <Text style={{ fontSize: 10 }}>{signatory2Title}</Text>
                        </View>
                    </View>
                </View>

                {/* Receipt Box */}
                <View style={styles.receiptContainer}>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Cert. Fee</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                        <Text style={styles.receiptValue}>Php. {certFee}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>O.R. No.</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                        <Text style={styles.receiptValue}>{orNumber}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Dated</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
                        <Text style={styles.receiptValue}>{datePaid}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};