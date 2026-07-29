import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Register Georgia Font
Font.register({
  family: 'Georgia',
  fonts: [
    { src: window.location.origin + '/fonts/georgia.ttf' }, 
    { src: window.location.origin + '/fonts/georgiab.ttf', fontWeight: 'bold' } 
  ]
});

// Helper function to convert numeric day into ordinal form
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
        hyphenationCallback: () => [],
    },
    underlineText: {
        fontWeight: 'bold',
        textDecoration: 'underline',
    },

    // --- TABLE LOGIC ---
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
        position: 'relative',
    },
    // Double horizontal line under every row
    doubleRowDivider: {
        width: '100%',
        borderBottomWidth: 0.75,
        borderColor: '#000',
        paddingBottom: 1.5, // Creates gap between double lines
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
        fontWeight: 'bold',
        textAlign: 'center',
    },

    signatoryContainer: {
        marginTop: 60,
        width: '100%',
        alignItems: 'flex-end',
    },
    signatoryBlock: {
        marginBottom: 60,
        textAlign: 'center',
        width: 250,
    },
    signatoryName: {
        fontWeight: 'bold',
        fontSize: 11,
    },

    receiptContainer: {
        position: 'absolute',
        bottom: 100, 
        left: 80,
        width: 150,
    },
    receiptRow: {
        flexDirection: 'row',
        marginBottom: 2,
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
});

export const CertOfLandholdingPDF = ({
    ownerName = '',
    properties = [],
    day = '',
    monthYear = '',
    orNumber = '',
    datePaid = '',
    certFee = '40.00',
    signatory1Name = 'ENGR. VICENTE P. DESUY',
    signatory1Title = 'Municipal Assessor',
    signatory2Name = 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    signatory2Title = 'Assistant Provincial Assessor',
    paperSizeOverride
}: any) => {

    const selectedPageSize = paperSizeOverride || (properties.length > 4 ? 'LEGAL' : 'LETTER');
    const INDENT = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

    return (
        <Document>
            <Page size={selectedPageSize} style={styles.page}>
                <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF LANDHOLDING</Text>

                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                    {/* Paragraph 1 */}
                    <Text style={styles.officialParagraph}>
                        <Text>{INDENT}</Text>
                        <Text style={{fontWeight: 'bold'}}>THIS IS TO CERTIFY</Text>
                        <Text> that </Text>
                        <Text style={styles.underlineText}>{String(ownerName).toUpperCase()}</Text>
                        <Text>, is/are the declared owner/s of real property/properties described hereunder within the taxing jurisdiction of this province.</Text>
                    </Text>

                    {/* Properties Table */}
                    <View style={styles.table}>
                        {/* Header Row */}
                        <View style={styles.doubleRowDivider}>
                            <View style={[styles.tableRow, { borderBottomWidth: 0.75, borderColor: '#000' }]}>
                                <View style={[styles.cell, { width: '18%' }]}><Text style={styles.thText}>TD/ARP No.</Text></View>
                                <View style={[styles.cell, { width: '26%' }]}><Text style={styles.thText}>Location of Prop.</Text></View>
                                <View style={[styles.cell, { width: '12%' }]}><Text style={styles.thText}>Lot No.</Text></View>
                                <View style={[styles.cell, { width: '12%' }]}><Text style={styles.thText}>Title No.</Text></View>
                                <View style={[styles.cell, { width: '14%' }]}><Text style={styles.thText}>Area</Text></View>
                                <View style={[styles.cell, { width: '18%' }]}><Text style={styles.thText}>Assd. Value</Text></View>
                            </View>
                        </View>

                        {/* Data Rows mapped strictly from properties */}
                        {properties.map((prop: any, index: number) => (
                            <View key={index} style={styles.doubleRowDivider}>
                                <View style={[styles.tableRow, { borderBottomWidth: 0.75, borderColor: '#000' }]} wrap={false}>
                                    <View style={[styles.cell, { width: '18%', alignItems: 'center' }]}>
                                        <Text style={styles.tdText}>{prop.tdNo || ''}</Text>
                                    </View>
                                    <View style={[styles.cell, { width: '26%', alignItems: 'center', paddingHorizontal: 2 }]}>
                                        <Text style={styles.tdText}>{prop.location || ''}</Text>
                                    </View>
                                    <View style={[styles.cell, { width: '12%', alignItems: 'center' }]}>
                                        <Text style={styles.tdText}>{prop.lotNo || ''}</Text>
                                    </View>
                                    <View style={[styles.cell, { width: '12%', alignItems: 'center' }]}>
                                        <Text style={styles.tdText}>{prop.titleNo || ''}</Text>
                                    </View>
                                    <View style={[styles.cell, { width: '14%', alignItems: 'center' }]}>
                                        <Text style={styles.tdText}>{prop.area || ''}</Text>
                                    </View>
                                    <View style={[styles.cell, { width: '18%', alignItems: 'center' }]}>
                                        <Text style={styles.tdText}>{prop.assdValue ? `PHP ${prop.assdValue}` : ''}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Paragraph 2 */}
                    <Text style={styles.officialParagraph}>
                        <Text>Given this </Text>
                        <Text style={styles.underlineText}>{getOrdinalSuffix(day)}</Text>
                        <Text> day of </Text>
                        <Text style={styles.underlineText}>{monthYear}</Text>
                        <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
                    </Text>

                    <View style={styles.signatoryContainer}>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory1Name}</Text>
                            <Text style={{fontSize: 11}}>{signatory1Title}</Text>
                        </View>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory2Name}</Text>
                            <Text style={{fontSize: 11}}>{signatory2Title}</Text>
                        </View>
                    </View>
                </View>

                {/* Receipt Section */}
                <View style={styles.receiptContainer}>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Cert. Fee</Text>
                        <Text style={{fontSize: 10, fontWeight: 'bold'}}>: </Text>
                        <Text style={styles.receiptValue}>Php. {certFee}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>O.R. No.</Text>
                        <Text style={{fontSize: 10, fontWeight: 'bold'}}>: </Text>
                        <Text style={styles.receiptValue}>{orNumber}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Dated</Text>
                        <Text style={{fontSize: 10, fontWeight: 'bold'}}>: </Text>
                        <Text style={styles.receiptValue}>{datePaid}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};