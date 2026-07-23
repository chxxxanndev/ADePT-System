import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Times-Roman',
        position: 'relative',
        fontSize: 11,
        lineHeight: 1.5,
    },
    background: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        objectFit: 'fill', zIndex: -1,
    },
    content: {
        paddingHorizontal: 50, // Slightly smaller margin to fit the table nicely
        paddingTop: 50,
        paddingBottom: 50,
    },
    headerCenter: {
        textAlign: 'center',
        marginBottom: 40,
    },
    headerNormal: { fontSize: 11, color: '#000080' },
    headerBold: { fontSize: 12, fontFamily: 'Times-Bold', color: '#000080', marginTop: 2 },

    title: {
        fontSize: 16,
        fontFamily: 'Times-Bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    salutation: {
        fontFamily: 'Times-Bold',
        marginBottom: 15,
    },
    paragraph: {
        textAlign: 'justify',
        marginBottom: 15,
        lineHeight: 1.6,
    },
    boldUnderline: {
        fontFamily: 'Times-Bold',
        textDecoration: 'underline',
    },

    // --- Table Styles ---
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 20,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0', // Slight gray background for header (optional, based on contrast)
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    tableDataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    // Column Widths
    colTD: { width: '20%', borderRightWidth: 1, borderColor: '#000', padding: 4, textAlign: 'center', justifyContent: 'center' },
    colLoc: { width: '25%', borderRightWidth: 1, borderColor: '#000', padding: 4, textAlign: 'center', justifyContent: 'center' },
    colLot: { width: '12%', borderRightWidth: 1, borderColor: '#000', padding: 4, textAlign: 'center', justifyContent: 'center' },
    colTitle: { width: '15%', borderRightWidth: 1, borderColor: '#000', padding: 4, textAlign: 'center', justifyContent: 'center' },
    colArea: { width: '13%', borderRightWidth: 1, borderColor: '#000', padding: 4, textAlign: 'center', justifyContent: 'center' },
    colAssd: { width: '15%', padding: 4, textAlign: 'center', justifyContent: 'center' }, // No right border on last item

    thText: { fontFamily: 'Times-Bold', fontSize: 10 },
    tdText: { fontSize: 10 },

    // Signatory Section
    signatoryContainer: {
        marginTop: 40,
        alignItems: 'center',
        paddingLeft: '40%',
    },
    signatoryBlock: {
        marginBottom: 40,
        alignItems: 'center',
    },
    signatoryName: {
        fontFamily: 'Times-Bold',
        fontSize: 11,
    },
    signatoryTitle: {
        fontSize: 11,
    },

    // Footer/Receipt Section
    receiptBox: {
        marginTop: 20,
        width: 200,
    },
    receiptRow: {
        flexDirection: 'row',
        marginBottom: 2,
        alignItems: 'flex-end',
    },
    receiptLabel: {
        width: 65,
        fontFamily: 'Times-Bold',
        fontSize: 10,
    },
    receiptValueContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    receiptValue: {
        fontFamily: 'Times-Bold',
        fontSize: 10,
        paddingLeft: 5,
    },
});

export const CertOfLandholdingPDF = ({
    ownerName = '',
    properties = [], // Expected array: [{ tdNo, location, lotNo, titleNo, area, assdValue }]
    day = '',
    monthYear = '',
    orNumber = '',
    datePaid = '',
    certFee = '40.00',
    signatory1Name = 'ELVIRA T. ENAO, REA',
    signatory1Title = 'Local Assessment Operations Officer IV',
    signatory2Name = 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    signatory2Title = 'Assistant Provincial Assessor'
}: any) => {

    // Fills the table with at least 1 empty row if no properties exist yet (prevents breaking)
    const displayProperties = properties.length > 0 ? properties : [
        { tdNo: '', location: '', lotNo: '', titleNo: '', area: '', assdValue: '' }
    ];

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                <Image fixed src={window.location.origin + '/images/official_bg.png'} style={styles.background} />

                <View style={styles.content}>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerNormal}>Republic of the Philippines</Text>
                        <Text style={styles.headerNormal}>Province of Zamboanga del Norte</Text>
                        <Text style={styles.headerBold}>OFFICE OF THE PROVINCIAL ASSESSOR</Text>
                        <Text style={styles.headerNormal}>GF, Provincial Capitol, Estaka, Dipolog City</Text>
                    </View>

                    <Text style={styles.title}>CERTIFICATE OF LANDHOLDING</Text>

                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                    <Text style={styles.paragraph}>
                        <Text>     THIS IS TO CERTIFY that </Text>
                        <Text style={styles.boldUnderline}>{String(ownerName).toUpperCase()}</Text>
                        <Text> is/are the declared owner/s of real property/properties described hereunder within the taxing jurisdiction of this province.</Text>
                    </Text>

                    {/* Properties Table */}
                    <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                            <View style={styles.colTD}><Text style={styles.thText}>TD/ARP No.</Text></View>
                            <View style={styles.colLoc}><Text style={styles.thText}>Location of Prop.</Text></View>
                            <View style={styles.colLot}><Text style={styles.thText}>Lot No.</Text></View>
                            <View style={styles.colTitle}><Text style={styles.thText}>Title No.</Text></View>
                            <View style={styles.colArea}><Text style={styles.thText}>Area</Text></View>
                            <View style={styles.colAssd}><Text style={styles.thText}>Assd. Value</Text></View>
                        </View>

                        {displayProperties.map((prop: any, index: number) => {
                            // Only draw bottom border if it is NOT the last row
                            const isLast = index === displayProperties.length - 1;
                            const rowStyle = isLast ? { flexDirection: 'row' } : styles.tableDataRow;

                            return (
                                <View key={index} style={rowStyle as any}>
                                    <View style={styles.colTD}><Text style={styles.tdText}>{prop.tdNo}</Text></View>
                                    <View style={styles.colLoc}><Text style={styles.tdText}>{prop.location}</Text></View>
                                    <View style={styles.colLot}><Text style={styles.tdText}>{prop.lotNo}</Text></View>
                                    <View style={styles.colTitle}><Text style={styles.tdText}>{prop.titleNo}</Text></View>
                                    <View style={styles.colArea}><Text style={styles.tdText}>{prop.area}</Text></View>
                                    <View style={styles.colAssd}><Text style={styles.tdText}>{prop.assdValue ? `Php ${prop.assdValue}` : ''}</Text></View>
                                </View>
                            );
                        })}
                    </View>

                    <Text style={styles.paragraph}>
                        <Text>     Given this </Text>
                        <Text style={styles.boldUnderline}>{day}</Text>
                        <Text> day of </Text>
                        <Text style={styles.boldUnderline}>{monthYear}</Text>
                        <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
                    </Text>

                    <View style={styles.signatoryContainer}>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory1Name}</Text>
                            <Text style={styles.signatoryTitle}>{signatory1Title}</Text>
                        </View>
                        <View style={styles.signatoryBlock}>
                            <Text style={styles.signatoryName}>{signatory2Name}</Text>
                            <Text style={styles.signatoryTitle}>{signatory2Title}</Text>
                        </View>
                    </View>

                    <View style={styles.receiptBox}>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Cert. Fee</Text>
                            <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>: </Text>
                            <View style={styles.receiptValueContainer}>
                                <Text style={styles.receiptValue}>Php. {certFee}</Text>
                            </View>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>O.R. No.</Text>
                            <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>: </Text>
                            <View style={styles.receiptValueContainer}>
                                <Text style={styles.receiptValue}>{orNumber}</Text>
                            </View>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Dated</Text>
                            <Text style={{ fontFamily: 'Times-Bold', fontSize: 10 }}>: </Text>
                            <View style={styles.receiptValueContainer}>
                                <Text style={styles.receiptValue}>{datePaid}</Text>
                            </View>
                        </View>
                    </View>

                </View>
            </Page>
        </Document>
    );
};