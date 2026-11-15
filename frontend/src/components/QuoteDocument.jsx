import { fmtDate, img, inr, lines, richParts, fillVars } from '../utils'

function Rich({ text }) {
  return richParts(text).map(p => (p.b ? <b key={p.k}>{p.t}</b> : <span key={p.k}>{p.t}</span>))
}

function ShutterIcon() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" fill="none" stroke="#0f2547" strokeWidth="2.6" strokeLinejoin="round">
      <rect x="11" y="6" width="26" height="36" rx="2" />
      <rect x="15" y="10" width="18" height="28" rx="1.5" />
      <line x1="29" y1="21" x2="29" y2="27" strokeLinecap="round" />
    </svg>
  )
}

function Multiline({ text }) {
  const parts = String(text || '').split('\n')
  return parts.map((l, i) => (
    <div key={i} className={l.trim() === '' ? 'qd-gap' : ''}>{l.trim() === '' ? ' ' : <Rich text={l} />}</div>
  ))
}

/**
 * The printable quotation (A4 width = 794px). Used for preview, client link and PDF.
 * Page footer, side stripe and page numbers are added per page by the PDF generator.
 */
export default function QuoteDocument({ q, company, forPdf = false }) {
  const c = company || {}
  const wood = q.wood || {}
  const items = q.items || []
  const pairs = []
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2))
  const notes = lines(q.notes), terms = lines(q.terms), pay = lines(q.payment_terms), closing = lines(q.closing)
  let sec = 0
  const letter = () => String.fromCharCode(65 + sec++)

  return (
    <div className={'qd' + (forPdf ? ' qd-pdf' : '')}>
      {!forPdf && <div className="qd-stripe" />}
      <header className="qd-head">
        <div className="qd-brand">
          {c.logo && <img src={img(c.logo)} alt="" className="qd-logo" crossOrigin="anonymous" />}
          <div>
            <div className="qd-name1">{c.company_name}</div>
            <div className="qd-name2">{c.company_name2}</div>
            <div className="qd-tag">{c.tagline}</div>
          </div>
        </div>
        {c.header_image && (
          <div className="qd-hero"><img src={img(c.header_image)} alt="" crossOrigin="anonymous" /></div>
        )}
        <div className="qd-contact">
          {c.phones && (
            <div><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#c9932b" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>
              <span>{c.phones}</span></div>
          )}
          {c.locations && (
            <div><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#c9932b" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{c.locations}</span></div>
          )}
        </div>
      </header>

      <div className="qd-body">
        <h1 className="qd-title">{q.title || 'QUOTATION'}</h1>

        <div className="qd-info">
          <div><label>QUOTATION NO.</label><b>{q.quote_no || '—'}</b></div>
          <div><label>DATE</label><b>{fmtDate(q.quote_date)}</b></div>
          <div>
            <label>CLIENT</label><b>{q.client_name || '—'}</b>
            {(q.client_phone || q.client_address) && (
              <small>{[q.client_phone, q.client_address].filter(Boolean).join(' · ')}</small>
            )}
          </div>
        </div>

        <div className="qd-intro pb-avoid">
          <p>Respected Sir/Mam,</p>
          {q.intro && <p className="qd-indent">{fillVars(q.intro, q)}</p>}
        </div>

        {wood.show && (
          <section className="qd-sec">
            <h2 className="pb-avoid"><span>{letter()}.</span> {wood.heading}</h2>
            <table className="qd-wood">
              <thead>
                <tr className="pb-avoid">
                  {['left', 'right'].map(side => (
                    <th key={side}>
                      <div className="qd-wood-h">
                        <div className="qd-wood-ic">
                          {wood[side]?.image
                            ? <img src={img(wood[side].image)} alt="" crossOrigin="anonymous" />
                            : side === 'left' ? <ShutterIcon /> : null}
                        </div>
                        <span>{wood[side]?.title}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(wood.rows || []).map((r, i) => (
                  <tr key={i} className="pb-avoid">
                    <td className="l"><Multiline text={r.left} /></td>
                    <td className="r"><Multiline text={r.right} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {items.length > 0 && (
          <section className="qd-sec">
            <h2 className="pb-avoid"><span>{letter()}.</span> {q.acc_heading || 'ACCESSORIES'}</h2>
            <div className="qd-acc">
              {pairs.map((pair, i) => (
                <div className="qd-acc-row pb-avoid" key={i}>
                  {pair.map((it, j) => (
                    <div className="qd-card" key={j}>
                      <div className="qd-card-img">{it.image ? <img src={img(it.image)} alt="" crossOrigin="anonymous" /> : null}</div>
                      <div className="qd-card-name">
                        {it.name}
                        {it.note && <small>{it.note}</small>}
                      </div>
                      <div className="qd-eq">=</div>
                      <div className="qd-qty">{it.qty}</div>
                    </div>
                  ))}
                  {pair.length === 1 && <div className="qd-card qd-card-empty" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {(Number(q.amount) > 0 || q.amount_label) && (
          <div className="qd-amount pb-avoid">
            <div className="qd-amount-l">{String(q.amount_label || '').split('\n').map((l, i) => <div key={i}>{l}</div>)}</div>
            <div className="qd-amount-r"><span>=</span>{inr(q.amount)}/-</div>
          </div>
        )}

        {notes.length > 0 && (
          <div className="qd-block pb-avoid">
            <h3>NOTE :</h3>
            <ul className="qd-star">{notes.map((l, i) => <li key={i}><Rich text={l} /></li>)}</ul>
          </div>
        )}
        {terms.length > 0 && (
          <div className="qd-block">
            <h3 className="pb-avoid">TERMS AND CONDITION :</h3>
            <ul className="qd-dot">{terms.map((l, i) => <li key={i} className="pb-avoid"><Rich text={l} /></li>)}</ul>
          </div>
        )}
        {pay.length > 0 && (
          <div className="qd-block pb-avoid">
            <h3>PAYMENT TERMS:</h3>
            <ul className="qd-dot">{pay.map((l, i) => <li key={i}><Rich text={l} /></li>)}</ul>
          </div>
        )}
        {closing.length > 0 && (
          <ul className="qd-arrow pb-avoid">{closing.map((l, i) => <li key={i}><Rich text={l} /></li>)}</ul>
        )}

        <div className="qd-sign pb-avoid">
          <h3>BEST REGARDS.</h3>
          <div className="qd-sign-row">
            <div><i />Client</div>
            <div><i />{c.signature_label}</div>
          </div>
        </div>
      </div>

      {!forPdf && (
        <footer className="qd-foot">
          <span>{c.footer_text}</span><span>{c.phones}</span><span />
        </footer>
      )}
    </div>
  )
}
