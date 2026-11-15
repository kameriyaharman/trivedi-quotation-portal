import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import QuoteDocument from './components/QuoteDocument'

const NAVY = [15, 37, 71], GOLD = [201, 147, 43], CREAM = [248, 243, 234]
const TOP = 10, BOTTOM = 15 // mm page margins (footer lives in the bottom margin)

function waitImages(el) {
  const imgs = [...el.querySelectorAll('img')]
  return Promise.all(imgs.map(im => (im.complete && im.naturalWidth) ? null : new Promise(res => { im.onload = im.onerror = res })))
}

export function pdfFileName(q) {
  const s = `${q.quote_no || 'Quotation'}-${q.client_name || ''}`.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return `${s || 'Quotation'}.pdf`
}

/** Builds the quotation PDF. Returns a Blob. If save=true also downloads it. */
export async function buildPdf(q, company, { save = true } = {}) {
  const { default: html2pdf } = await import('html2pdf.js')
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1'
  document.body.appendChild(host)
  const root = createRoot(host)
  flushSync(() => root.render(<QuoteDocument q={q} company={company} forPdf />))
  try {
    await waitImages(host)
    if (document.fonts?.ready) await document.fonts.ready
    const el = host.firstElementChild
    const worker = html2pdf().set({
      margin: [TOP, 0, BOTTOM, 0],
      filename: pdfFileName(q),
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['css'], avoid: '.pb-avoid' },
    }).from(el).toPdf()

    const pdf = await worker.get('pdf')
    const n = pdf.internal.getNumberOfPages()
    const footer = company?.footer_text || ''
    const phones = company?.phones || ''
    for (let i = 1; i <= n; i++) {
      pdf.setPage(i)
      if (i === 1) { pdf.setFillColor(...CREAM); pdf.rect(0, 0, 210, TOP + 0.3, 'F') }
      // side stripe
      pdf.setFillColor(...NAVY); pdf.rect(0, 0, 1.9, 205, 'F')
      pdf.setFillColor(...GOLD); pdf.rect(0, 205, 1.9, 297 - 205, 'F')
      // footer band
      pdf.setFillColor(...NAVY); pdf.rect(0, 297 - 9.5, 210, 9.5, 'F')
      pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
      pdf.text(footer, 10, 297 - 3.8)
      pdf.text(phones, 105, 297 - 3.8, { align: 'center' })
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Page ${i} of ${n}`, 200, 297 - 3.8, { align: 'right' })
    }
    const blob = pdf.output('blob')
    if (save) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = pdfFileName(q)
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    }
    return blob
  } finally {
    root.unmount()
    host.remove()
  }
}

/** On phones: share the actual PDF file (WhatsApp appears in the share sheet). */
export async function sharePdf(q, company) {
  const blob = await buildPdf(q, company, { save: false })
  const file = new File([blob], pdfFileName(q), { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: q.quote_no, text: `Quotation ${q.quote_no}` })
    return true
  }
  return false
}
