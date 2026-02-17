'use client'

import {
  Document, Page, Text, View, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import { PAYMENT_TERMS_OPTIONS, translateMaterialName } from '@/lib/types'

// ============================================
// Types
// ============================================

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

// ============================================
// Styles (Stripe/PandaDoc inspired)
// ============================================

const TEAL = '#008B99'
const GREEN = '#78BE20'
const SLATE = '#64748B'
const DARK = '#0F172A'
const LIGHT_BG = '#F8FAFC'
const BORDER = '#E2E8F0'

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
    color: DARK,
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
  },
  logoArea: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: TEAL,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: 8,
    color: SLATE,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CBD5E1',
    letterSpacing: 2,
  },
  docMeta: {
    fontSize: 9,
    color: SLATE,
    marginTop: 4,
    textAlign: 'right',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: LIGHT_BG,
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    gap: 30,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 10,
    color: DARK,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  infoTextLight: {
    fontSize: 9,
    color: SLATE,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // Schedule pills
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  schedulePill: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  schedulePillLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  schedulePillValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DARK,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  // Description
  description: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.6,
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: TEAL,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFBFC',
  },
  tableCol1: { flex: 3 },
  tableCol2: { flex: 1, alignItems: 'center' as const },
  tableCol3: { flex: 1, alignItems: 'flex-end' as const },
  tableCellMain: {
    fontSize: 10,
    color: DARK,
    fontWeight: 'bold',
  },
  tableCellSub: {
    fontSize: 9,
    color: SLATE,
  },
  tableCellMoney: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DARK,
  },

  // Category label
  categoryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 12,
  },

  // Photos
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

  // Financial section
  financialSection: {
    marginTop: 24,
    alignItems: 'flex-end',
  },
  financialBox: {
    width: 260,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  financialLabel: {
    fontSize: 9,
    color: SLATE,
  },
  financialValue: {
    fontSize: 10,
    color: DARK,
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
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Payment terms
  paymentTerms: {
    fontSize: 9,
    color: SLATE,
    marginTop: 12,
    textAlign: 'right',
    paddingRight: 4,
  },

  // Signature
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
    borderBottomColor: DARK,
    marginBottom: 6,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: TEAL,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: SLATE,
  },
  footerBrand: {
    fontSize: 7,
    color: TEAL,
    fontWeight: 'bold',
  },
})

// ============================================
// Helper
// ============================================

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null, en: boolean) {
  if (!d) return '-'
  return new Date(d + 'T12:00').toLocaleDateString(en ? 'en-US' : 'es', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ============================================
// Component
// ============================================

export function EstimatePDF(props: EstimatePdfProps) {
  const {
    mode, isEn, clientName, clientAddress, clientEmail, clientPhone,
    contractorName, contractorCompany, contractorPhone, contractorEmail, contractorWebsite,
    jobId, createdAt, startDate, durationDays, paymentTerms,
    simpleDescription, items, subtotalMaterials, subtotalLabor, subtotalOther,
    overhead, overheadPct, margin, marginPct, total, photos,
  } = props

  const ptLabel = PAYMENT_TERMS_OPTIONS.find(p => p.value === paymentTerms)
  const ptText = isEn ? ptLabel?.label_en : ptLabel?.label_es

  const getName = (name: string) => isEn ? translateMaterialName(name) : name

  const materialItems = items.filter(i => i.category === 'material')
  const laborItems = items.filter(i => i.category === 'labor')
  const otherItems = items.filter(i => i.category === 'other')

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

        {/* ===== HEADER ===== */}
        <View style={s.header}>
          <View style={s.logoArea}>
            <Text style={s.logoText}>
              {contractorCompany || 'RoofBack'}
            </Text>
            {contractorCompany ? (
              <Text style={s.logoSubtext}>Powered by RoofBack</Text>
            ) : (
              <Text style={s.logoSubtext}>{isEn ? 'The way to grow.' : 'La manera de crecer.'}</Text>
            )}
            {contractorPhone && <Text style={[s.infoTextLight, { marginTop: 4 }]}>{contractorPhone}</Text>}
            {contractorEmail && <Text style={s.infoTextLight}>{contractorEmail}</Text>}
            {contractorWebsite && <Text style={s.infoTextLight}>{contractorWebsite}</Text>}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{isEn ? 'ESTIMATE' : 'PRESUPUESTO'}</Text>
            <Text style={s.docMeta}>#{jobId.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.docMeta}>{fmtDate(createdAt?.split('T')[0], isEn)}</Text>
          </View>
        </View>

        {/* ===== INFO GRID ===== */}
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
            {durationDays > 0 && <Text style={s.infoTextLight}>{isEn ? 'Duration: ' : 'Duración: '}{durationDays} {isEn ? 'days' : 'días'}</Text>}
            <Text style={s.infoTextLight}>{isEn ? 'Valid for 30 days' : 'Válido por 30 días'}</Text>
            {contractorName && <Text style={[s.infoTextLight, { marginTop: 4 }]}>{isEn ? 'By: ' : 'Por: '}{contractorName}</Text>}
          </View>
        </View>

        {/* ===== SCHEDULE PILLS ===== */}
        {startDate && (
          <View style={s.scheduleRow}>
            <View style={s.schedulePill}>
              <Text style={s.schedulePillLabel}>{isEn ? 'START DATE' : 'FECHA DE INICIO'}</Text>
              <Text style={s.schedulePillValue}>{fmtDate(startDate, isEn)}</Text>
            </View>
            <View style={s.schedulePill}>
              <Text style={s.schedulePillLabel}>{isEn ? 'ESTIMATED DURATION' : 'DURACIÓN ESTIMADA'}</Text>
              <Text style={s.schedulePillValue}>{durationDays} {isEn ? 'days' : 'días'}</Text>
            </View>
            {ptText && (
              <View style={s.schedulePill}>
                <Text style={s.schedulePillLabel}>{isEn ? 'PAYMENT' : 'PAGO'}</Text>
                <Text style={s.schedulePillValue}>{ptText}</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== SCOPE OF WORK (Simple) ===== */}
        {mode === 'simple' && simpleDescription && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'ALCANCE DEL TRABAJO'}</Text>
            <Text style={s.description}>{simpleDescription}</Text>
          </View>
        )}

        {/* ===== ITEMIZED TABLE ===== */}
        {mode === 'itemized' && items.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'DETALLE DEL PRESUPUESTO'}</Text>

            {/* Table Header */}
            <View style={s.tableHeader}>
              <View style={s.tableCol1}><Text style={s.tableHeaderText}>{isEn ? 'DESCRIPTION' : 'DESCRIPCIÓN'}</Text></View>
              <View style={s.tableCol2}><Text style={[s.tableHeaderText, { textAlign: 'center' }]}>{isEn ? 'QTY' : 'CANT.'}</Text></View>
              <View style={s.tableCol3}><Text style={[s.tableHeaderText, { textAlign: 'right' }]}>TOTAL</Text></View>
            </View>

            {/* Materials */}
            {materialItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'MATERIALS' : 'MATERIALES'}</Text>
                {renderTableRows(materialItems)}
              </>
            )}

            {/* Labor */}
            {laborItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'LABOR' : 'MANO DE OBRA'}</Text>
                {renderTableRows(laborItems)}
              </>
            )}

            {/* Other */}
            {otherItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'OTHER' : 'OTROS'}</Text>
                {renderTableRows(otherItems)}
              </>
            )}
          </View>
        )}

        {/* ===== PHOTOS ===== */}
        {photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionTitle}>{isEn ? 'CURRENT CONDITION' : 'CONDICIÓN ACTUAL'}</Text>
            <View style={s.photosGrid}>
              {photos.slice(0, 4).map((url, i) => (
                <Image key={i} src={url} style={s.photo} />
              ))}
            </View>
          </View>
        )}

        {/* ===== FINANCIAL SECTION ===== */}
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

            {/* TOTAL */}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalValue}>{fmtMoney(total)}</Text>
            </View>

            {/* Payment Terms */}
            {ptText && (
              <Text style={s.paymentTerms}>
                {isEn ? 'Payment: ' : 'Pago: '}{ptText}
              </Text>
            )}
          </View>
        </View>

        {/* ===== SIGNATURE SECTION ===== */}
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

        {/* ===== FOOTER ===== */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {isEn
              ? 'This estimate is valid for 30 days from issue date.'
              : 'Este presupuesto es válido por 30 días desde la fecha de emisión.'}
          </Text>
          <Text style={s.footerBrand}>RoofBack — {isEn ? 'The way to grow.' : 'La manera de crecer.'}</Text>
        </View>

      </Page>
    </Document>
  )
}
