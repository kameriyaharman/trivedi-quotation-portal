import { ImageInput } from './ui'

export const emptyWood = { show: true, heading: 'WOODEN WORK', left: { title: '', image: '' }, right: { title: '', image: '' }, rows: [] }

export default function WoodEditor({ value, onChange }) {
  const w = { ...emptyWood, ...(value || {}) }
  const set = patch => onChange({ ...w, ...patch })
  const setSide = (side, patch) => set({ [side]: { ...w[side], ...patch } })
  const setRow = (i, patch) => set({ rows: w.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  return (
    <div className="wood-ed">
      <label className="check"><input type="checkbox" checked={!!w.show} onChange={e => set({ show: e.target.checked })} /> Show this section in quotation</label>
      {w.show && <>
        <label className="fld">Section heading<input className="input" value={w.heading} onChange={e => set({ heading: e.target.value })} /></label>
        <div className="wood-cols">
          {['left', 'right'].map(side => (
            <div key={side} className="wood-col">
              <ImageInput value={w[side].image} onChange={v => setSide(side, { image: v })} size={64} label="Icon" />
              <label className="fld grow">{side === 'left' ? 'Left column title' : 'Right column title'}
                <input className="input" value={w[side].title} onChange={e => setSide(side, { title: e.target.value })} />
              </label>
            </div>
          ))}
        </div>
        <div className="wood-rows">
          {w.rows.map((r, i) => (
            <div key={i} className="wood-row">
              <textarea className="input" rows={3} placeholder="Left text (Enter for new line)" value={r.left} onChange={e => setRow(i, { left: e.target.value })} />
              <textarea className="input" rows={3} placeholder="Right text" value={r.right} onChange={e => setRow(i, { right: e.target.value })} />
              <button type="button" className="icon-btn del" title="Remove row" onClick={() => set({ rows: w.rows.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="btn ghost sm" onClick={() => set({ rows: [...w.rows, { left: '', right: '' }] })}>+ Add row</button>
        </div>
      </>}
    </div>
  )
}
