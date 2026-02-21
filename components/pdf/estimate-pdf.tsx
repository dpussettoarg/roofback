'use client'

import {
  Document, Page, Text, View, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import { PAYMENT_TERMS_OPTIONS, translateMaterialName, formatEstimateNumber } from '@/lib/types'

interface PdfItem {
  name: string
  category: 'material' | 'labor' | 'other'
  quantity: number
  unit: string
  unit_price: number
}

export interface EstimatePdfProps {
  mode: 'simple' | 'itemized'
  isEn: boolean
  clientName: string
  clientAddress: string
  clientEmail: string
  clientPhone: string
  contractorName: string
  contractorCompany: string
  contractorPhone: string
  contractorEmail: string
  contractorWebsite: string
  jobId: string
  jobNumber?: number | null
  estimateVersion?: number
  createdAt: string
  startDate: string | null
  durationDays: number
  paymentTerms: string
  simpleDescription: string
  items: PdfItem[]
  subtotalMaterials: number
  subtotalLabor: number
  subtotalOther: number
  overhead: number
  overheadPct: number
  margin: number
  marginPct: number
  total: number
  photos: string[]
}

const CHARCOAL = '#0F1117'
const SURFACE = '#1E2228'
const LIME = '#A8FF3E'
const LIME_DARK = '#7ACC2E'
const GRAY = '#9CA3AF'
const GRAY_LIGHT = '#6B7280'
const WHITE = '#FFFFFF'
const BORDER = '#2A2D35'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: WHITE,
    backgroundColor: CHARCOAL,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: LIME,
  },
  logoArea: {
    flexDirection: 'column',
  },
  logoImage: {
    width: 160,
    height: 48,
    objectFit: 'contain',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: LIME,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: 8,
    color: GRAY_LIGHT,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GRAY_LIGHT,
    letterSpacing: 2,
  },
  docNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: LIME,
    marginTop: 4,
    textAlign: 'right' as const,
  },
  docMeta: {
    fontSize: 9,
    color: GRAY_LIGHT,
    marginTop: 2,
    textAlign: 'right' as const,
  },

  infoGrid: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    gap: 30,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: LIME,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 10,
    color: WHITE,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  infoTextLight: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  schedulePill: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    borderWidth: 1,
    borderColor: BORDER,
  },
  schedulePillLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: GRAY_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  schedulePillValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: WHITE,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: LIME,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  description: {
    fontSize: 10,
    color: GRAY,
    lineHeight: 1.6,
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: LIME,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: SURFACE,
  },
  tableCol1: { flex: 3 },
  tableCol2: { flex: 1, alignItems: 'center' as const },
  tableCol3: { flex: 1, alignItems: 'flex-end' as const },
  tableCellMain: {
    fontSize: 10,
    color: WHITE,
    fontWeight: 'bold',
  },
  tableCellSub: {
    fontSize: 9,
    color: GRAY,
  },
  tableCellMoney: {
    fontSize: 10,
    fontWeight: 'bold',
    color: WHITE,
  },

  categoryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: GRAY_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 12,
  },

  photosGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  photo: {
    width: 130,
    height: 100,
    borderRadius: 6,
    objectFit: 'cover',
  },

  financialSection: {
    marginTop: 24,
    alignItems: 'flex-end',
  },
  financialBox: {
    width: 260,
    backgroundColor: SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  financialLabel: {
    fontSize: 9,
    color: GRAY,
  },
  financialValue: {
    fontSize: 10,
    color: WHITE,
    fontWeight: 'bold',
  },
  financialDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 4,
    marginHorizontal: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LIME,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: CHARCOAL,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CHARCOAL,
  },

  paymentTermsText: {
    fontSize: 9,
    color: GRAY,
    marginTop: 12,
    textAlign: 'right' as const,
    paddingRight: 4,
  },

  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    gap: 40,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LIGHT,
    marginBottom: 6,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY_LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: GRAY_LIGHT,
  },
  footerBrand: {
    fontSize: 7,
    color: LIME,
    fontWeight: 'bold',
  },
})

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null, en: boolean) {
  if (!d) return '-'
  return new Date(d + 'T12:00').toLocaleDateString(en ? 'en-US' : 'es', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function EstimatePDF(props: EstimatePdfProps) {
  const {
    mode, isEn, clientName, clientAddress, clientEmail, clientPhone,
    contractorName, contractorCompany, contractorPhone, contractorEmail, contractorWebsite,
    jobNumber, estimateVersion = 1, createdAt, startDate, durationDays, paymentTerms,
    simpleDescription, items, subtotalMaterials, subtotalLabor, subtotalOther,
    overhead, overheadPct, margin, marginPct, total, photos,
  } = props

  const ptLabel = PAYMENT_TERMS_OPTIONS.find(p => p.value === paymentTerms)
  const ptText = isEn ? ptLabel?.label_en : ptLabel?.label_es

  const getName = (name: string) => isEn ? translateMaterialName(name) : name

  const materialItems = items.filter(i => i.category === 'material')
  const laborItems = items.filter(i => i.category === 'labor')
  const otherItems = items.filter(i => i.category === 'other')

  const docNumber = jobNumber
    ? formatEstimateNumber(jobNumber, estimateVersion)
    : ''

  const renderTableRows = (rows: PdfItem[]) =>
    rows.map((item, i) => (
      <View key={i} style={i % 2 !== 0 ? [s.tableRow, s.tableRowAlt] : s.tableRow}>
        <View style={s.tableCol1}>
          <Text style={s.tableCellMain}>{getName(item.name)}</Text>
        </View>
        <View style={s.tableCol2}>
          <Text style={s.tableCellSub}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={s.tableCol3}>
          <Text style={s.tableCellMoney}>{fmtMoney(item.quantity * item.unit_price)}</Text>
        </View>
      </View>
    ))

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        <View style={s.header}>
          <View style={s.logoArea}>
            {/* RoofBack logo — loaded from public/logo.png via absolute URL */}
            <Image
              src={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://roofback.app'}/logo.png`}
              style={s.logoImage}
            />
            {contractorCompany ? (
              <Text style={s.logoSubtext}>{contractorCompany}</Text>
            ) : (
              <Text style={s.logoSubtext}>{isEn ? 'The way to grow.' : 'La manera de crecer.'}</Text>
            )}
            {contractorPhone && <Text style={[s.infoTextLight, { marginTop: 4 }]}>{contractorPhone}</Text>}
            {contractorEmail && <Text style={s.infoTextLight}>{contractorEmail}</Text>}
            {contractorWebsite && <Text style={s.infoTextLight}>{contractorWebsite}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{isEn ? 'ESTIMATE' : 'PRESUPUESTO'}</Text>
            {docNumber ? (
              <Text style={s.docNumber}>#{docNumber}</Text>
            ) : null}
            <Text style={s.docMeta}>{fmtDate(createdAt?.split('T')[0], isEn)}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{isEn ? 'PREPARED FOR' : 'PREPARADO PARA'}</Text>
            <Text style={s.infoText}>{clientName}</Text>
            {clientAddress ? <Text style={s.infoTextLight}>{clientAddress}</Text> : null}
            {clientEmail ? <Text style={s.infoTextLight}>{clientEmail}</Text> : null}
            {clientPhone ? <Text style={s.infoTextLight}>{clientPhone}</Text> : null}
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{isEn ? 'PROJECT DETAILS' : 'DETALLES DEL PROYECTO'}</Text>
            {startDate && <Text style={s.infoText}>{isEn ? 'Start: ' : 'Inicio: '}{fmtDate(startDate, isEn)}</Text>}
            {durationDays > 0 && <Text style={s.infoTextLight}>{isEn ? 'Duration: ' : 'Duraci\u00f3n: '}{durationDays} {isEn ? 'days' : 'd\u00edas'}</Text>}
            <Text style={s.infoTextLight}>{isEn ? 'Valid for 30 days' : 'V\u00e1lido por 30 d\u00edas'}</Text>
            {contractorName && <Text style={[s.infoTextLight, { marginTop: 4 }]}>{isEn ? 'By: ' : 'Por: '}{contractorName}</Text>}
          </View>
        </View>

        {startDate && (
          <View style={s.scheduleRow}>
            <View style={s.schedulePill}>
              <Text style={s.schedulePillLabel}>{isEn ? 'START DATE' : 'FECHA DE INICIO'}</Text>
              <Text style={s.schedulePillValue}>{fmtDate(startDate, isEn)}</Text>
            </View>
            <View style={s.schedulePill}>
              <Text style={s.schedulePillLabel}>{isEn ? 'ESTIMATED DURATION' : 'DURACI\u00d3N ESTIMADA'}</Text>
              <Text style={s.schedulePillValue}>{durationDays} {isEn ? 'days' : 'd\u00edas'}</Text>
            </View>
            {ptText && (
              <View style={s.schedulePill}>
                <Text style={s.schedulePillLabel}>{isEn ? 'PAYMENT' : 'PAGO'}</Text>
                <Text style={s.schedulePillValue}>{ptText}</Text>
              </View>
            )}
          </View>
        )}

        {mode === 'simple' && simpleDescription && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'ALCANCE DEL TRABAJO'}</Text>
            <Text style={s.description}>{simpleDescription}</Text>
          </View>
        )}

        {mode === 'itemized' && items.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'DETALLE DEL PRESUPUESTO'}</Text>

            <View style={s.tableHeader}>
              <View style={s.tableCol1}><Text style={s.tableHeaderText}>{isEn ? 'DESCRIPTION' : 'DESCRIPCI\u00d3N'}</Text></View>
              <View style={s.tableCol2}><Text style={[s.tableHeaderText, { textAlign: 'center' }]}>{isEn ? 'QTY' : 'CANT.'}</Text></View>
              <View style={s.tableCol3}><Text style={[s.tableHeaderText, { textAlign: 'right' }]}>TOTAL</Text></View>
            </View>

            {materialItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'MATERIALS' : 'MATERIALES'}</Text>
                {renderTableRows(materialItems)}
              </>
            )}

            {laborItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'LABOR' : 'MANO DE OBRA'}</Text>
                {renderTableRows(laborItems)}
              </>
            )}

            {otherItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'OTHER' : 'OTROS'}</Text>
                {renderTableRows(otherItems)}
              </>
            )}
          </View>
        )}

        {photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>{isEn ? 'CURRENT CONDITION' : 'CONDICI\u00d3N ACTUAL'}</Text>
            <View style={s.photosGrid}>
              {photos.slice(0, 4).map((url, i) => (
                <Image key={i} src={url} style={s.photo} />
              ))}
            </View>
          </View>
        )}

        <View style={s.financialSection}>
          <View style={s.financialBox}>
            {mode === 'itemized' && (
              <>
                <View style={s.financialRow}>
                  <Text style={s.financialLabel}>{isEn ? 'Materials' : 'Materiales'}</Text>
                  <Text style={s.financialValue}>{fmtMoney(subtotalMaterials)}</Text>
                </View>
                <View style={s.financialRow}>
                  <Text style={s.financialLabel}>{isEn ? 'Labor' : 'Mano de obra'}</Text>
                  <Text style={s.financialValue}>{fmtMoney(subtotalLabor)}</Text>
                </View>
                {subtotalOther > 0 && (
                  <View style={s.financialRow}>
                    <Text style={s.financialLabel}>{isEn ? 'Other' : 'Otros'}</Text>
                    <Text style={s.financialValue}>{fmtMoney(subtotalOther)}</Text>
                  </View>
                )}
                <View style={s.financialRow}>
                  <Text style={s.financialLabel}>{isEn ? 'Overhead' : 'Gastos generales'} ({overheadPct}%)</Text>
                  <Text style={s.financialValue}>{fmtMoney(overhead)}</Text>
                </View>
                <View style={s.financialRow}>
                  <Text style={s.financialLabel}>{isEn ? 'Margin' : 'Margen'} ({marginPct}%)</Text>
                  <Text style={s.financialValue}>{fmtMoney(margin)}</Text>
                </View>
                <View style={s.financialDivider} />
              </>
            )}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>{fmtMoney(total)}</Text>
            </View>

            {ptText && (
              <Text style={s.paymentTermsText}>
                {isEn ? 'Payment: ' : 'Pago: '}{ptText}
              </Text>
            )}
          </View>
        </View>

        <View style={s.signatureSection}>
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{isEn ? 'Client Signature' : 'Firma del Cliente'}</Text>
            <Text style={[s.signatureLabel, { marginTop: 2 }]}>{clientName}</Text>
          </View>
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{isEn ? 'Date' : 'Fecha'}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {isEn
              ? 'This estimate is valid for 30 days from issue date.'
              : 'Este presupuesto es v\u00e1lido por 30 d\u00edas desde la fecha de emisi\u00f3n.'}
          </Text>
          <Text style={s.footerBrand}>RoofBack — {isEn ? 'The way to grow.' : 'La manera de crecer.'}</Text>
        </View>

      </Page>
    </Document>
  )
}
