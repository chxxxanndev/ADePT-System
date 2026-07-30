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

const formatCurrency = (value: string | number) => {
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  },
  underlineText: {
    fontWeight: 'bold',
    textDecoration: 'underline',
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
    position: 'relative',
  },
  doubleRowDivider: {
    width: '100%',
    borderBottomWidth: 0.75,
    borderColor: '#000',
    paddingBottom: 1.5,
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
    paperSizeOverride,
    request
  } = props;

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

  const selectedPageSize = paperSizeOverride || (properties.length > 4 ? 'LEGAL' : 'LETTER');
  const INDENT = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

  return (
    <Document>
      <Page size={selectedPageSize as any} style={styles.page}>
        <Image src={`${getBaseUrl()}/images/landholding_header.png`} style={styles.headerImage} />
        <Image fixed src={`${getBaseUrl()}/images/landholding_bg.png`} style={styles.bottomBackground} />

        <View style={styles.content}>
          <Text style={styles.title}>CERTIFICATE OF LANDHOLDING</Text>
          <Text style={styles.salutation}>TO WHOM IT MAY CONCERN:</Text>

          <Text style={styles.officialParagraph}>
            <Text>{INDENT}</Text>
            <Text style={{ fontWeight: 'bold' }}>THIS IS TO CERTIFY</Text>
            <Text> that </Text>
            <Text style={styles.underlineText}>{String(displayName).toUpperCase()}</Text>
            <Text>, is/are the declared owner/s of real property/properties described hereunder within the taxing jurisdiction of this province.</Text>
          </Text>

          <View style={styles.table}>
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

            {properties.map((prop: any, index: number) => {
                // Check all possible key variants (camelCase, snake_case, and legacy)
                const td = prop.tdArpNumber || prop.td_arp_number || prop.tdNo || prop.td_number || '';
                const loc = prop.locationOfProperty || prop.location_of_property || prop.location || prop.property_location || prop.propertyLocation || '';
                const lot = prop.lotNumber || prop.lot_number || prop.lotNo || '';
                const title = prop.titleNumber || prop.title_number || prop.titleNo || '';
                const areaVal = prop.area || prop.areaSqM || '';
                const assd = prop.assessedValue || prop.assessed_value || prop.assdValue || '';

                return (
                    <View key={index} style={styles.doubleRowDivider}>
                        <View style={[styles.tableRow, { borderBottomWidth: 0.75, borderColor: '#000' }]} wrap={false}>
                            <View style={[styles.cell, { width: '18%', alignItems: 'center' }]}>
                                <Text style={styles.tdText}>{td}</Text>
                            </View>
                            <View style={[styles.cell, { width: '26%', alignItems: 'center', paddingHorizontal: 2 }]}>
                                <Text style={styles.tdText}>{loc}</Text>
                            </View>
                            <View style={[styles.cell, { width: '12%', alignItems: 'center' }]}>
                                <Text style={styles.tdText}>{lot}</Text>
                            </View>
                            <View style={[styles.cell, { width: '12%', alignItems: 'center' }]}>
                                <Text style={styles.tdText}>{title}</Text>
                            </View>
                            <View style={[styles.cell, { width: '14%', alignItems: 'center' }]}>
                                <Text style={styles.tdText}>{areaVal}</Text>
                            </View>
                            <View style={[styles.cell, { width: '18%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }]}>
                                {assd !== '' && (
                                    <>
                                        <Text style={styles.tdText}>PHP</Text>
                                        <Text style={styles.tdText}>{formatCurrency(assd)}</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                );
            })}
          </View>

          <Text style={styles.officialParagraph}>
            <Text>Given this </Text>
            <Text style={styles.underlineText}>{displayDay ? getOrdinalSuffix(displayDay) : '____'}</Text>
            <Text> day of </Text>
            <Text style={styles.underlineText}>{displayMonthYear || '________________'}</Text>
            <Text>, at Dipolog City for whatever legal purpose/intent it may serve best.</Text>
          </Text>

          <View style={styles.signatoryContainer}>
            <View style={styles.signatoryBlock}>
              <Text style={styles.signatoryName}>{activeSignatory1Name}</Text>
              <Text style={{ fontSize: 11 }}>{activeSignatory1Title}</Text>
            </View>
            {signatory2Name && (
              <View style={styles.signatoryBlock}>
                <Text style={styles.signatoryName}>{signatory2Name}</Text>
                <Text style={{ fontSize: 11 }}>{signatory2Title}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.receiptContainer}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Cert. Fee</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
            <Text style={styles.receiptValue}>Php. {certFee}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>O.R. No.</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
            <Text style={styles.receiptValue}>{finalOrNumber}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Dated</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>: </Text>
            <Text style={styles.receiptValue}>{finalDatePaid}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};