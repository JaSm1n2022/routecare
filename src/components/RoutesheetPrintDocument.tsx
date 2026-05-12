import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import dayjs from 'dayjs'
import { CLIENT_SERVICES } from '../utils/constants'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: 80,
    marginBottom: 15,
    objectFit: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  staffInfoTable: {
    display: 'table',
    width: 'auto',
    marginBottom: 15,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  staffInfoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    minHeight: 25,
    alignItems: 'center',
  },
  staffInfoLabel: {
    width: '30%',
    padding: 5,
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  staffInfoValue: {
    width: '70%',
    padding: 5,
    fontSize: 9,
  },
  table: {
    display: 'table',
    width: 'auto',
    marginTop: 15,
    marginBottom: 15,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    backgroundColor: '#e0e0e0',
    minHeight: 30,
    alignItems: 'center',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    minHeight: 25,
    alignItems: 'center',
  },
  tableCol: {
    padding: 3,
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  tableColPatient: {
    width: '15%',
  },
  tableColDate: {
    width: '10%',
  },
  tableColTimeIn: {
    width: '8%',
  },
  tableColTimeOut: {
    width: '8%',
  },
  tableColService: {
    width: '10%',
  },
  tableColSignature: {
    width: '20%',
  },
  tableColComments: {
    width: '29%',
  },
  signatureImage: {
    width: 80,
    height: 30,
    objectFit: 'contain',
  },
  headerText: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    minHeight: 30,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  totalLabel: {
    width: '80%',
    padding: 5,
    fontSize: 10,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalValue: {
    width: '20%',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    borderLeftWidth: 1,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
  },
  serviceCodesSection: {
    marginTop: 20,
  },
  serviceCodesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  serviceCodesTable: {
    display: 'table',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  serviceCodesHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    backgroundColor: '#e0e0e0',
    minHeight: 25,
    alignItems: 'center',
    fontWeight: 'bold',
  },
  serviceCodesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    minHeight: 20,
    alignItems: 'center',
  },
  serviceCodesHeaderCol: {
    width: '16.66%',
    padding: 5,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    justifyContent: 'center',
  },
  serviceCodesDataCol: {
    width: '16.66%',
    padding: 3,
    fontSize: 7,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    justifyContent: 'center',
  },
})

interface Routesheet {
  id: string
  dosStart: string
  dosEnd?: string
  timeIn?: string
  timeOut?: string
  patientCd: string
  service: string
  serviceCd?: string
  signature_based?: string
  comments?: string
  estimatedPayment: number
}

interface RoutesheetPrintDocumentProps {
  routesheets: Routesheet[]
  employeeName: string
  position: string
  logoBase64?: string
}

export function RoutesheetPrintDocument({
  routesheets,
  employeeName,
  position,
  logoBase64,
}: RoutesheetPrintDocumentProps) {
  // Calculate total
  const total = routesheets.reduce((sum, sheet) => {
    return sum + (parseFloat(sheet.estimatedPayment?.toString() || '0'))
  }, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          {logoBase64 && (
            <Image src={logoBase64} style={styles.logo} />
          )}
          <Text style={styles.title}>Route Sheet</Text>

          {/* Staff Info Table */}
          <View style={styles.staffInfoTable}>
            <View style={styles.staffInfoRow}>
              <Text style={styles.staffInfoLabel}>Staff Member</Text>
              <Text style={styles.staffInfoValue}>{employeeName}</Text>
            </View>
            {position && (
              <View style={[styles.staffInfoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.staffInfoLabel}>Position</Text>
                <Text style={styles.staffInfoValue}>{position}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Main Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow} fixed>
            <View style={[styles.tableCol, styles.tableColPatient, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Client</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColDate, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Date</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColTimeIn, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Time In</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColTimeOut, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Time Out</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColService, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Service Code</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColSignature, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Signature</Text>
            </View>
            <View style={[styles.tableCol, styles.tableColComments, { borderRightWidth: 0, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerText}>Comments</Text>
            </View>
          </View>

          {/* Table Rows */}
          {routesheets.map((sheet, index) => {
            // Extract date from dosStart
            const date = dayjs(sheet.dosStart).format('YYYY-MM-DD')
            const timeIn = sheet.timeIn || dayjs(sheet.dosStart).format('HH:mm')
            const timeOut = sheet.timeOut || sheet.dosEnd ? dayjs(sheet.dosEnd).format('HH:mm') : ''

            // Get service code
            let serviceCode = sheet.serviceCd || ''
            if (!serviceCode && sheet.service) {
              const serviceMatch = CLIENT_SERVICES.find(s => s.name === sheet.service)
              serviceCode = serviceMatch ? serviceMatch.code : sheet.service
            }

            // Trim patient code - remove digits and dots
            const trimmedPatient = sheet.patientCd
              .replace(/\d/g, '')
              .replace(/\./g, '')
              .trim()
              .substring(0, 20)

            return (
              <View key={sheet.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCol, styles.tableColPatient]}>
                  {trimmedPatient}
                </Text>
                <Text style={[styles.tableCol, styles.tableColDate]}>
                  {date}
                </Text>
                <Text style={[styles.tableCol, styles.tableColTimeIn]}>
                  {timeIn}
                </Text>
                <Text style={[styles.tableCol, styles.tableColTimeOut]}>
                  {timeOut}
                </Text>
                <Text style={[styles.tableCol, styles.tableColService]}>
                  {serviceCode}
                </Text>
                <View style={[styles.tableCol, styles.tableColSignature, { justifyContent: 'center', alignItems: 'center' }]}>
                  {sheet.signature_based ? (
                    <Image src={sheet.signature_based} style={styles.signatureImage} />
                  ) : (
                    <Text style={{ fontSize: 7 }}>-</Text>
                  )}
                </View>
                <Text style={[styles.tableCol, styles.tableColComments, { borderRightWidth: 0 }]}>
                  {sheet.comments || ''}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Earnings:</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>

        {/* Service Codes Table */}
        <View style={styles.serviceCodesSection}>
          <Text style={styles.serviceCodesTitle}>Service Codes</Text>
          <View style={styles.serviceCodesTable}>
            {/* Header Row */}
            <View style={styles.serviceCodesHeaderRow}>
              <Text style={styles.serviceCodesHeaderCol}>Code</Text>
              <Text style={styles.serviceCodesHeaderCol}>Description</Text>
              <Text style={styles.serviceCodesHeaderCol}>Code</Text>
              <Text style={styles.serviceCodesHeaderCol}>Description</Text>
              <Text style={styles.serviceCodesHeaderCol}>Code</Text>
              <Text style={[styles.serviceCodesHeaderCol, { borderRightWidth: 0 }]}>Description</Text>
            </View>

            {/* Data Rows - 3 services per row (6 columns total) */}
            {Array.from({ length: Math.ceil(CLIENT_SERVICES.length / 3) }).map((_, rowIdx) => {
              const startIdx = rowIdx * 3
              const rowServices = CLIENT_SERVICES.slice(startIdx, startIdx + 3)

              return (
                <View key={`service-row-${rowIdx}`} style={styles.serviceCodesRow}>
                  {/* Service 1: Code */}
                  <Text style={styles.serviceCodesDataCol}>
                    {rowServices[0]?.code || ''}
                  </Text>
                  {/* Service 1: Description */}
                  <Text style={styles.serviceCodesDataCol}>
                    {rowServices[0]?.name || ''}
                  </Text>

                  {/* Service 2: Code */}
                  <Text style={styles.serviceCodesDataCol}>
                    {rowServices[1]?.code || ''}
                  </Text>
                  {/* Service 2: Description */}
                  <Text style={styles.serviceCodesDataCol}>
                    {rowServices[1]?.name || ''}
                  </Text>

                  {/* Service 3: Code */}
                  <Text style={styles.serviceCodesDataCol}>
                    {rowServices[2]?.code || ''}
                  </Text>
                  {/* Service 3: Description (no right border) */}
                  <Text style={[styles.serviceCodesDataCol, { borderRightWidth: 0 }]}>
                    {rowServices[2]?.name || ''}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </Page>
    </Document>
  )
}
