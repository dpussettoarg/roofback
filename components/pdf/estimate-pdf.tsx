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
  // Org branding (optional — falls back to profile data)
  companyLogoUrl?: string | null
  businessAddress?: string | null
  businessPhone?: string | null
  businessEmail?: string | null
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

// ─── White-theme palette ─────────────────────────────────────────────────────
const BG      = '#FFFFFF'
const TEXT    = '#1d1d1f'
const ACCENT  = '#1a1a2e'   // deep navy for headers/badges
const LIME    = '#22c55e'   // professional green accent
const GRAY    = '#6B7280'
const GRAY_LT = '#9CA3AF'
const BORDER  = '#E5E7EB'
const ROW_ALT = '#F9FAFB'

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
    color: TEXT,
    backgroundColor: BG,
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 42,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: LIME,
  },
  logoArea: {
    flexDirection: 'column',
    maxWidth: 200,
  },
  logoImage: {
    width: 160,
    height: 52,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: ACCENT,
    marginBottom: 3,
  },
  contactLine: {
    fontSize: 8.5,
    color: GRAY,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ACCENT,
    letterSpacing: 2,
  },
  docNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: LIME,
    marginTop: 4,
    textAlign: 'right' as const,
  },
  docMeta: {
    fontSize: 8.5,
    color: GRAY,
    marginTop: 2,
    textAlign: 'right' as const,
  },

  // ── Info grid ──────────────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: ROW_ALT,
    borderRadius: 8,
    padding: 18,
    marginBottom: 22,
    gap: 28,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: LIME,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 7,
  },
  infoText: {
    fontSize: 10,
    color: TEXT,
    fontWeight: 'bold',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  infoTextLight: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // ── Schedule pills ─────────────────────────────────────────────────────────
  scheduleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  schedulePill: {
    flex: 1,
    backgroundColor: ROW_ALT,
    borderRadius: 6,
    padding: 11,
    borderLeftWidth: 3,
    borderLeftColor: LIME,
    borderWidth: 1,
    borderColor: BORDER,
  },
  schedulePillLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  schedulePillValue: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: TEXT,
  },

  // ── Section titles ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  description: {
    fontSize: 10,
    color: GRAY,
    lineHeight: 1.6,
    marginBottom: 22,
  },

  // ── Table ──────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 1,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: BG,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
  },
  tableCol1: { flex: 3 },
  tableCol2: { flex: 1, alignItems: 'center' as const },
  tableCol3: { flex: 1, alignItems: 'flex-end' as const },
  tableCellMain: {
    fontSize: 10,
    color: TEXT,
    fontWeight: 'bold',
  },
  tableCellSub: {
    fontSize: 9,
    color: GRAY,
  },
  tableCellMoney: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TEXT,
  },

  categoryLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 5,
    paddingLeft: 12,
  },

  // ── Photos ─────────────────────────────────────────────────────────────────
  photosGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  photo: {
    width: 128,
    height: 96,
    borderRadius: 6,
    objectFit: 'cover',
  },

  // ── Financial summary ──────────────────────────────────────────────────────
  financialSection: {
    marginTop: 22,
    alignItems: 'flex-end',
  },
  financialBox: {
    width: 264,
    backgroundColor: ROW_ALT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 6,
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
    color: TEXT,
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
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BG,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: BG,
  },

  paymentTermsText: {
    fontSize: 8.5,
    color: GRAY,
    marginTop: 10,
    textAlign: 'right' as const,
    paddingRight: 2,
  },

  // ── Signature ──────────────────────────────────────────────────────────────
  signatureSection: {
    marginTop: 38,
    flexDirection: 'row',
    gap: 40,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LT,
    marginBottom: 6,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: GRAY_LT,
  },
  footerBrand: {
    fontSize: 7,
    color: GRAY,
  },
  footerPowered: {
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
    companyLogoUrl, businessAddress, businessPhone, businessEmail,
    jobNumber, estimateVersion = 1, createdAt, startDate, durationDays, paymentTerms,
    simpleDescription, items, subtotalMaterials, subtotalLabor, subtotalOther,
    overhead, overheadPct, margin, marginPct, total, photos,
  } = props

  const ptLabel = PAYMENT_TERMS_OPTIONS.find(p => p.value === paymentTerms)
  const ptText = isEn ? ptLabel?.label_en : ptLabel?.label_es

  const getName = (name: string) => isEn ? translateMaterialName(name) : name

  const materialItems = items.filter(i => i.category === 'material')
  const laborItems    = items.filter(i => i.category === 'labor')
  const otherItems    = items.filter(i => i.category === 'other')

  const docNumber = jobNumber ? formatEstimateNumber(jobNumber, estimateVersion) : ''

  // Contact info: org branding takes precedence over profile fields
  const displayPhone   = businessPhone   || contractorPhone   || ''
  const displayEmail   = businessEmail   || contractorEmail   || ''
  const displayAddress = businessAddress || ''

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

        {/* ── Header: Company Logo (left) + Document info (right) ─── */}
        <View style={s.header}>
          <View style={s.logoArea}>
            {companyLogoUrl ? (
              <Image src={companyLogoUrl} style={s.logoImage} />
            ) : (
              <Image
                src={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://roofback.app'}/logo.png`}
                style={s.logoImage}
              />
            )}
            {contractorCompany ? (
              <Text style={s.companyName}>{contractorCompany}</Text>
            ) : null}
            {displayAddress ? <Text style={s.contactLine}>{displayAddress}</Text> : null}
            {displayPhone   ? <Text style={s.contactLine}>{displayPhone}</Text>   : null}
            {displayEmail   ? <Text style={s.contactLine}>{displayEmail}</Text>   : null}
            {contractorWebsite ? <Text style={s.contactLine}>{contractorWebsite}</Text> : null}
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTitle}>{isEn ? 'ESTIMATE' : 'PRESUPUESTO'}</Text>
            {docNumber ? <Text style={s.docNumber}>#{docNumber}</Text> : null}
            <Text style={s.docMeta}>{fmtDate(createdAt?.split('T')[0], isEn)}</Text>
          </View>
        </View>

        {/* ── Client / Project info ──────────────────────────────── */}
        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{isEn ? 'PREPARED FOR' : 'PREPARADO PARA'}</Text>
            <Text style={s.infoText}>{clientName}</Text>
            {clientAddress ? <Text style={s.infoTextLight}>{clientAddress}</Text> : null}
            {clientEmail   ? <Text style={s.infoTextLight}>{clientEmail}</Text>   : null}
            {clientPhone   ? <Text style={s.infoTextLight}>{clientPhone}</Text>   : null}
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>{isEn ? 'PROJECT DETAILS' : 'DETALLES DEL PROYECTO'}</Text>
            {startDate && <Text style={s.infoText}>{isEn ? 'Start: ' : 'Inicio: '}{fmtDate(startDate, isEn)}</Text>}
            {durationDays > 0 && <Text style={s.infoTextLight}>{isEn ? 'Duration: ' : 'Duración: '}{durationDays} {isEn ? 'days' : 'días'}</Text>}
            <Text style={s.infoTextLight}>{isEn ? 'Valid for 30 days' : 'Válido por 30 días'}</Text>
            {contractorName && <Text style={[s.infoTextLight, { marginTop: 4 }]}>{isEn ? 'By: ' : 'Por: '}{contractorName}</Text>}
          </View>
        </View>

        {/* ── Schedule pills ──────────────────────────────────────── */}
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

        {/* ── Scope of Work (simple mode) ──────────────────────── */}
        {mode === 'simple' && simpleDescription && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'ALCANCE DEL TRABAJO'}</Text>
            <Text style={s.description}>{simpleDescription}</Text>
          </View>
        )}

        {/* ── Itemized breakdown ──────────────────────────────── */}
        {mode === 'itemized' && items.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={s.sectionTitle}>{isEn ? 'SCOPE OF WORK' : 'DETALLE DEL PRESUPUESTO'}</Text>

            <View style={s.tableHeader}>
              <View style={s.tableCol1}><Text style={s.tableHeaderText}>{isEn ? 'DESCRIPTION' : 'DESCRIPCIÓN'}</Text></View>
              <View style={s.tableCol2}><Text style={[s.tableHeaderText, { textAlign: 'center' }]}>{isEn ? 'QTY' : 'CANT.'}</Text></View>
              <View style={s.tableCol3}><Text style={[s.tableHeaderText, { textAlign: 'right' }]}>TOTAL</Text></View>
            </View>

            {/* 1. Materials */}
            {materialItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'MATERIALS' : 'MATERIALES'}</Text>
                {renderTableRows(materialItems)}
              </>
            )}

            {/* 2. Labor */}
            {laborItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'LABOR' : 'MANO DE OBRA'}</Text>
                {renderTableRows(laborItems)}
              </>
            )}

            {/* 3. Other / Expenses */}
            {otherItems.length > 0 && (
              <>
                <Text style={s.categoryLabel}>{isEn ? 'OTHER EXPENSES' : 'OTROS GASTOS'}</Text>
                {renderTableRows(otherItems)}
              </>
            )}
          </View>
        )}

        {/* ── Site photos ─────────────────────────────────────── */}
        {photos.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.sectionTitle}>{isEn ? 'CURRENT CONDITION' : 'CONDICIÓN ACTUAL'}</Text>
            <View style={s.photosGrid}>
              {photos.slice(0, 4).map((url, i) => (
                <Image key={i} src={url} style={s.photo} />
              ))}
            </View>
          </View>
        )}

        {/* ── Financial summary ────────────────────────────────── */}
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
                    <Text style={s.financialLabel}>{isEn ? 'Other expenses' : 'Otros gastos'}</Text>
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

        {/* ── Signature section ────────────────────────────────── */}
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

        {/* ── Footer (every page) ──────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {isEn
              ? 'This estimate is valid for 30 days from issue date.'
              : 'Este presupuesto es válido por 30 días desde la fecha de emisión.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Text style={s.footerBrand}>{contractorCompany || 'RoofBack'}</Text>
            <Text style={s.footerText}>·</Text>
            <Text style={s.footerPowered}>Powered by roofback.app</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
