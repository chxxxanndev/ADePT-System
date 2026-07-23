import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// 1. REGISTER GEORGIA FONT
Font.register({
  family: 'Georgia',
  fonts: [
    { src: window.location.origin + '/fonts/georgia.ttf' }, 
    { src: window.location.origin + '/fonts/georgiab.ttf', fontWeight: 'bold' } 
  ]
});

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontFamily: 'Georgia',
        position: 'relative',
        fontSize: 12,
        lineHeight: 1.2, // Tightened slightly to save vertical space
    },
    headerImage: {
        width: '100%',
        height: 'auto',
    },
    // Bottom Background pinned to bottom, no stretching
    bottomBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 180, // Reduced height slightly to save space
        objectFit: 'cover',
        zIndex: -1,
    },
    content: {
        paddingHorizontal: 70,
        paddingTop: 5,
        paddingBottom: 20, // Reduced significantly to prevent page 2 spill
    },
    title: {
        fontSize: 23,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 30, // Reduced from 50 to pull content up
    },
    salutation: {
        fontWeight: 'bold',
        marginBottom: 15,
        fontSize: 12,
        marginLeft: 35, 
    },
    // Indented first line, left-aligned wrapping
    officialParagraph: {
        textAlign: 'justify',
        marginBottom: 15,
        fontSize: 12,
        marginLeft: 0,     
        textIndent: 58,    // Indents exactly under 'H' of 'WHOM'
    },
    underlineText: {
        fontWeight: 'bold',
        textDecoration: 'underline',
    },

    // Signatories Block
    signatoryContainer: {
        marginTop: 30, // Reduced from 50
        width: '100%',
        alignItems: 'flex-end',
    },
    signatoryBlock: {
        marginBottom: 30,
        textAlign: 'center',
        width: 250,
    },
    signatoryName: {
        fontWeight: 'bold',
        fontSize: 12,
        textDecoration: 'underline',
    },

    // Receipt Section (Overlaid on footer image)
    receiptContainer: {
        position: 'absolute',
        bottom: 100, // Positioned specifically over the background footer
        left: 70,
        width: 220,
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

export const CertOfNoLandholdingPDF = ({
    ownerName = '',
    day = '',
    monthYear = '',
    orNumber = '',
    datePaid = '',
    certFee = '40.00',
    signatory1Name = 'ENGR. VICENTE P. DESUY',
    signatory1Title = 'Municipal Assessor',
    signatory2Name = 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    signatory2Title = 'Assistant Provincial Assessor'
}: any) => {

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Images */}
                <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF NO LANDHOLDING</Text>

                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                    {/* Paragraph 1 */}
                    <Text style={styles.officialParagraph}>
                        <Text style={{fontWeight: 'bold'}}>THIS IS TO CERTIFY</Text>
                        <Text> that </Text>
                        <Text style={styles.underlineText}>{String(ownerName).toUpperCase()}</Text>
                        <Text> has/have no real property/properties declared in his/her/their name/s either singly or collectively within the taxing jurisdiction of this province per office records.</Text>
                    </Text>

                    {/* Paragraph 2 */}
                    <Text style={styles.officialParagraph}>
                        <Text>Given this </Text>
                        <Text style={styles.underlineText}>{day}</Text>
                        <Text> day of </Text>
                        <Text style={styles.underlineText}>{monthYear}</Text>
                        <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
                    </Text>

                    {/* Signatories */}
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

                {/* Receipt Box */}
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