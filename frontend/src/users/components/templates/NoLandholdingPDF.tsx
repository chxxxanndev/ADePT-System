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
        paddingHorizontal: 60, // Wider margins as seen in the image
        paddingTop: 50,
        paddingBottom: 50,
    },
    headerCenter: {
        textAlign: 'center',
        marginBottom: 40,
    },
    headerNormal: { fontSize: 11, color: '#000080' }, // Navy blue tint often found in letterheads
    headerBold: { fontSize: 12, fontFamily: 'Times-Bold', color: '#000080', marginTop: 2 },

    title: {
        fontSize: 16,
        fontFamily: 'Times-Bold',
        textAlign: 'center',
        marginBottom: 40,
    },
    salutation: {
        fontFamily: 'Times-Bold',
        marginBottom: 20,
    },
    paragraph: {
        textAlign: 'justify',
        marginBottom: 20,
        textIndent: 30, // Indents the first line
        lineHeight: 1.6,
    },
    boldUnderline: {
        fontFamily: 'Times-Bold',
        textDecoration: 'underline',
    },

    // Signatory Section
    signatoryContainer: {
        marginTop: 60,
        alignItems: 'center',
        paddingLeft: '40%', // Pushes the block to the center-right
    },
    signatoryBlock: {
        marginBottom: 50,
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
        marginTop: 40,
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

export const CertOfNoLandholdingPDF = ({
    ownerName = '',
    day = '',
    monthYear = '',
    orNumber = '',
    datePaid = '',
    certFee = '40.00',
    signatory1Name = 'ELVIRA T. ENAO, REA',
    signatory1Title = 'Local Assessment Operations Officer IV',
    signatory2Name = 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    signatory2Title = 'Assistant Provincial Assessor'
}: any) => (
    <Document>
        <Page size="LETTER" style={styles.page}>
            <Image fixed src={window.location.origin + '/images/official_bg.png'} style={styles.background} />

            <View style={styles.content}>
                {/* Header - (Adjust or remove if this text is already baked into your background image) */}
                <View style={styles.headerCenter}>
                    <Text style={styles.headerNormal}>Republic of the Philippines</Text>
                    <Text style={styles.headerNormal}>Province of Zamboanga del Norte</Text>
                    <Text style={styles.headerBold}>OFFICE OF THE PROVINCIAL ASSESSOR</Text>
                    <Text style={styles.headerNormal}>GF, Provincial Capitol, Estaka, Dipolog City</Text>
                </View>

                <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>

                <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                <Text style={styles.paragraph}>
                    <Text>     THIS IS TO CERTIFY that </Text>
                    <Text style={styles.boldUnderline}>{String(ownerName).toUpperCase()}</Text>
                    <Text> has/have no real property/properties declared in his/her/their name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
                </Text>

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