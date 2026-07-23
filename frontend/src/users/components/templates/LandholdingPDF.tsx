import { Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Register Georgia
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
        paddingHorizontal: 70,
        paddingTop: 15,
        paddingBottom: 40, 
    },
    title: {
        fontSize: 23,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 40, 
    },
    salutation: {
        fontWeight: 'bold',
        marginBottom: 15,
        fontSize: 12,
        marginLeft: 35,
    },
    officialParagraph: {
        textAlign: 'justify',
        marginBottom: 12,
        fontSize: 12,
        textIndent: 63,
    },
    underlineText: {
        fontWeight: 'bold',
        textDecoration: 'underline',
    },

    // --- FIXED TABLE LOGIC ---
    table: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
        borderTopWidth: 1,    // Outer top border
        borderLeftWidth: 1,   // Outer left border
        borderColor: '#000',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1, // Horizontal lines
        borderColor: '#000',
        minHeight: 22,
        alignItems: 'stretch', // Ensures vertical lines connect
    },
    cell: {
        borderRightWidth: 1,  // Vertical lines
        borderColor: '#000',
        padding: 4,
        justifyContent: 'center',
    },
    thText: { 
        fontWeight: 'bold', 
        fontSize: 11, 
        textAlign: 'center' 
    },
    tdText: { 
        fontSize: 9, 
        fontWeight: 'bold',
        textAlign: 'center',
    },

    signatoryContainer: {
        marginTop: 20,
        width: '100%',
        alignItems: 'flex-end',
    },
    signatoryBlock: {
        marginBottom: 25,
        textAlign: 'center',
        width: 250,
    },
    signatoryName: {
        fontWeight: 'bold',
        fontSize: 12,
        textDecoration: 'underline',
    },

    receiptContainer: {
        position: 'absolute',
        bottom: 100, 
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
    signatory2Title = 'Assistant Provincial Assessor'
}: any) => {

    const displayProperties = properties.length > 0 ? properties : [{}, {}];

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                <Image src={window.location.origin + '/images/landholding_header.png'} style={styles.headerImage} />
                <Image fixed src={window.location.origin + '/images/landholding_bg.png'} style={styles.bottomBackground} />

                <View style={styles.content}>
                    <Text style={styles.title}>CERTIFICATE OF LANDHOLDING</Text>

                    <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

                    <Text style={styles.officialParagraph}>
                        <Text style={{fontWeight: 'bold'}}>THIS IS TO CERTIFY</Text>
                        <Text> that </Text>
                        <Text style={styles.underlineText}>{String(ownerName).toUpperCase()}</Text>
                        <Text>, is/are the declared owner/s of real property/properties described hereunder within the taxing jurisdiction of this province.</Text>
                    </Text>

                    {/* Properties Table */}
                    <View style={styles.table}>
                        {/* Header Row */}
                        <View style={styles.tableRow}>
                            <View style={[styles.cell, {width: '20%'}]}><Text style={styles.thText}>TD/ARP No.</Text></View>
                            <View style={[styles.cell, {width: '24%'}]}><Text style={styles.thText}>Location of Prop.</Text></View>
                            <View style={[styles.cell, {width: '12%'}]}><Text style={styles.thText}>Lot No.</Text></View>
                            <View style={[styles.cell, {width: '12%'}]}><Text style={styles.thText}>Title No.</Text></View>
                            <View style={[styles.cell, {width: '12%'}]}><Text style={styles.thText}>Area</Text></View>
                            <View style={[styles.cell, {width: '20%'}]}><Text style={styles.thText}>Assd. Value</Text></View>
                        </View>

                        {/* Data Rows */}
                        {displayProperties.map((prop: any, index: number) => (
                            <View key={index} style={styles.tableRow}>
                                <View style={[styles.cell, {width: '20%', alignItems: 'center'}]}><Text style={styles.tdText}>{prop.tdNo || ''}</Text></View>
                                <View style={[styles.cell, {width: '24%', alignItems: 'center'}]}><Text style={styles.tdText}>{prop.location || ''}</Text></View>
                                <View style={[styles.cell, {width: '12%', alignItems: 'center'}]}><Text style={styles.tdText}>{prop.lotNo || ''}</Text></View>
                                <View style={[styles.cell, {width: '12%', alignItems: 'center'}]}><Text style={styles.tdText}>{prop.titleNo || ''}</Text></View>
                                <View style={[styles.cell, {width: '12%', alignItems: 'center'}]}><Text style={styles.tdText}>{prop.area || ''}</Text></View>
                                <View style={[styles.cell, {width: '20%', paddingLeft: 5, alignItems: 'flex-start'}]}>
                                    <Text style={styles.tdText}>PHP {prop.assdValue || ''}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.officialParagraph}>
                        <Text>Given this </Text>
                        <Text style={styles.underlineText}>{day}</Text>
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