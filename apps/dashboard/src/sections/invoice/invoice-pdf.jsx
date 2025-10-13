import { useMemo } from 'react';
import {
  Page,
  Text,
  View,
  Font,
  Image,
  Document,
  PDFViewer,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InvoicePDFDownload({ invoice, currentStatus }) {
  const renderButton = (loading) => (
    <Tooltip title="Download">
      <IconButton disabled={!invoice}>
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <Iconify icon="eva:cloud-download-fill" />
        )}
      </IconButton>
    </Tooltip>
  );

  if (!invoice) {
    return renderButton(false);
  }

  return (
    <PDFDownloadLink
      document={<InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />}
      fileName={`${invoice?.invoiceNumber || 'invoice'}.pdf`}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => renderButton(loading)}
    </PDFDownloadLink>
  );
}

// ----------------------------------------------------------------------

export function InvoicePDFViewer({ invoice, currentStatus }) {
  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>No invoice data available</p>
      </div>
    );
  }

  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <InvoicePdfDocument invoice={invoice} currentStatus={currentStatus} />
    </PDFViewer>
  );
}

// ----------------------------------------------------------------------

// Register fonts with proper format specification and error handling
// This will only register once globally
if (typeof window !== 'undefined') {
  try {
    Font.register({
      family: 'Roboto',
      src: '/fonts/Roboto-Regular.ttf',
      fontWeight: 'normal',
    });
    
    Font.register({
      family: 'Roboto',
      src: '/fonts/Roboto-Bold.ttf', 
      fontWeight: 'bold',
    });
  } catch (error) {
    console.warn('Failed to register Roboto fonts, using system fonts:', error);
  }
}

const useStyles = () => {
  // Use Helvetica as fallback if Roboto registration fails
  const fontFamily = 'Roboto'; // Will fallback to Helvetica automatically if not available
  
  return useMemo(
    () =>
      StyleSheet.create({
        // layout
        page: {
          fontSize: 9,
          lineHeight: 1.6,
          fontFamily,
          backgroundColor: '#FFFFFF',
          padding: '40px 24px 120px 24px',
        },
        footer: {
          left: 0,
          right: 0,
          bottom: 0,
          padding: 24,
          margin: 'auto',
          borderTopWidth: 1,
          borderStyle: 'solid',
          position: 'absolute',
          borderColor: '#e9ecef',
        },
        container: { flexDirection: 'row', justifyContent: 'space-between' },
        // margin
        mb4: { marginBottom: 4 },
        mb8: { marginBottom: 8 },
        mb40: { marginBottom: 40 },
        // text
        h3: { fontSize: 16, fontWeight: 700, lineHeight: 1.2 },
        h4: { fontSize: 12, fontWeight: 700 },
        text1: { fontSize: 10 },
        text2: { fontSize: 9 },
        text1Bold: { fontSize: 10, fontWeight: 700 },
        text2Bold: { fontSize: 9, fontWeight: 700 },
        // table
        table: { display: 'flex', width: '100%' },
        row: {
          padding: '10px 0 8px 0',
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderStyle: 'solid',
          borderColor: '#e9ecef',
        },
        cell_1: { width: '5%' },
        cell_2: { width: '50%' },
        cell_3: { width: '15%', paddingLeft: 32 },
        cell_4: { width: '15%', paddingLeft: 8 },
        cell_5: { width: '15%' },
        noBorder: { paddingTop: '10px', paddingBottom: 0, borderBottomWidth: 0 },
      }),
    [fontFamily]
  );
};

function InvoicePdfDocument({ invoice, currentStatus }) {
  // Provide defaults for missing data
  const {
    items = [],
    taxes = 0,
    dueDate = new Date(),
    discount = 0,
    shipping = 0,
    subtotal = 0,
    invoiceTo = { name: 'N/A', fullAddress: 'N/A', phoneNumber: 'N/A' },
    createDate = new Date(),
    totalAmount = 0,
    invoiceFrom = { name: 'Wirecrest Inc.', fullAddress: 'N/A', phoneNumber: 'N/A' },
    invoiceNumber = 'INV-000000',
  } = invoice ?? {};

  const styles = useStyles();

  const renderHeader = () => (
    <View style={[styles.container, styles.mb40]}>
      <Image source="/logo/logo-single.png" style={{ width: 48, height: 48 }} />

      <View style={{ alignItems: 'flex-end', flexDirection: 'column' }}>
        <Text style={[styles.h3, styles.mb8, { textTransform: 'capitalize' }]}>
          {currentStatus}
        </Text>
        <Text style={[styles.text2]}>{invoiceNumber}</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.container, styles.footer]} fixed>
      <View style={{ width: '75%' }}>
        <Text style={[styles.text2Bold, styles.mb4]}>NOTES</Text>
        <Text style={[styles.text2]}>
          We appreciate your business. Should you need us to add VAT or extra notes let us know!
        </Text>
      </View>
      <View style={{ width: '25%', textAlign: 'right' }}>
        <Text style={[styles.text2Bold, styles.mb4]}>Have a question?</Text>
        <Text style={[styles.text2]}>support@abcapp.com</Text>
      </View>
    </View>
  );

  const renderBillingInfo = () => (
    <View style={[styles.container, styles.mb40]}>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Invoice from</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.name}</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.fullAddress}</Text>
        <Text style={[styles.text2]}>{invoiceFrom?.phoneNumber}</Text>
      </View>

      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Invoice to</Text>
        <Text style={[styles.text2]}>{invoiceTo?.name}</Text>
        <Text style={[styles.text2]}>{invoiceTo?.fullAddress}</Text>
        <Text style={[styles.text2]}>{invoiceTo?.phoneNumber}</Text>
      </View>
    </View>
  );

  const renderDates = () => (
    <View style={[styles.container, styles.mb40]}>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Date create</Text>
        <Text style={[styles.text2]}>{fDate(createDate)}</Text>
      </View>
      <View style={{ width: '50%' }}>
        <Text style={[styles.text1Bold, styles.mb4]}>Due date</Text>
        <Text style={[styles.text2]}>{fDate(dueDate)}</Text>
      </View>
    </View>
  );

  const renderTable = () => (
    <>
      <Text style={[styles.text1Bold]}>Invoice details</Text>

      <View style={styles.table}>
        <View>
          <View style={styles.row}>
            <View style={styles.cell_1}>
              <Text style={[styles.text2Bold]}>#</Text>
            </View>
            <View style={styles.cell_2}>
              <Text style={[styles.text2Bold]}>Description</Text>
            </View>
            <View style={styles.cell_3}>
              <Text style={[styles.text2Bold]}>Qty</Text>
            </View>
            <View style={styles.cell_4}>
              <Text style={[styles.text2Bold]}>Unit price</Text>
            </View>
            <View style={[styles.cell_5, { textAlign: 'right' }]}>
              <Text style={[styles.text2Bold]}>Total</Text>
            </View>
          </View>
        </View>

        <View>
          {items?.map((item, index) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.cell_1}>
                <Text>{index + 1}</Text>
              </View>
              <View style={styles.cell_2}>
                <Text style={[styles.text2Bold]}>{item.title}</Text>
                <Text style={[styles.text2]}>{item.description}</Text>
              </View>
              <View style={styles.cell_3}>
                <Text style={[styles.text2]}>{item.quantity}</Text>
              </View>
              <View style={styles.cell_4}>
                <Text style={[styles.text2]}>{item.price}</Text>
              </View>
              <View style={[styles.cell_5, { textAlign: 'right' }]}>
                <Text style={[styles.text2]}>{fCurrency(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}

          {[
            { name: 'Subtotal', value: subtotal },
            { name: 'Shipping', value: shipping ?? 0 },
            { name: 'Discount', value: -(discount ?? 0) },
            { name: 'Taxes', value: taxes },
            { name: 'Total', value: totalAmount, styles: styles.h4 },
          ].map((item) => (
            <View key={item.name} style={[styles.row, styles.noBorder]}>
              <View style={styles.cell_1} />
              <View style={styles.cell_2} />
              <View style={styles.cell_3} />
              <View style={styles.cell_4}>
                <Text style={[item.styles ?? styles.text2]}>{item.name}</Text>
              </View>
              <View style={[styles.cell_5, { textAlign: 'right' }]}>
                <Text style={[item.styles ?? styles.text2]}>{fCurrency(item.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {renderBillingInfo()}
        {renderDates()}
        {renderTable()}
        {renderFooter()}
      </Page>
    </Document>
  );
}
