// Ornamenti in stile gotico (SVG, colore dal tema: cremisi con alone di notte, rosso sangue di giorno).
import React from 'react';

const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Fregio dei titoli: croce con estremità trilobate fra due ali di pipistrello, e due filetti spinati. */
export function Frieze({ width = 230 }: { width?: number }) {
  const wing = (
    <g>
      <path d="M172 13 C190 3 212 5 232 11 Q226 14 224 20 Q218 15 212 21 Q207 16 200 22 Q195 17 188 21 Q182 16 172 15Z" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M172 13 L224 20 M172 13 L212 21 M172 13 L200 22" {...S} strokeWidth=".7" />
    </g>
  );
  const thorns = [244, 262, 280, 298].map((x) => <path key={x} d={`M${x} 13 L${x + 3} 6 L${x + 6} 13`} {...S} strokeWidth=".9" />);
  const side = (
    <g>
      <path d="M236 13 H316" {...S} strokeWidth=".9" />
      {thorns}
      <circle cx="319" cy="13" r="1.6" fill="currentColor" />
    </g>
  );
  return (
    <svg className="orn" aria-hidden="true" viewBox="0 0 320 30" width={width} height={(width * 30) / 320} style={{ display: 'block' }}>
      {side}
      <g transform="translate(320 0) scale(-1 1)">{side}</g>
      {wing}
      <g transform="translate(320 0) scale(-1 1)">{wing}</g>
      {/* croce con estremità trilobate e quadrilobo al centro */}
      <path d="M160 2 V27 M149 12 H171" {...S} strokeWidth="1.4" />
      {[[160, 2], [149, 12], [171, 12]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="2" fill="currentColor" />)}
      <path d="M160 29 L157.5 25 H162.5Z" fill="currentColor" />
      {[[158.6, 12], [161.4, 12], [160, 10.6], [160, 13.4]].map(([x, y]) => <circle key={x + '_' + y} cx={x} cy={y} r="1.5" fill="var(--color-bg)" stroke="currentColor" strokeWidth=".7" />)}
    </svg>
  );
}

function CornerSvg({ size }: { size: number }) {
  return (
    <svg className="orn" aria-hidden="true" viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }}>
      <path d="M3 62 V12 Q3 3 12 3 H62 M8 62 V14 Q8 8 14 8 H62" {...S} strokeWidth="1" />
      {/* pinnacolo acuminato sull'angolo */}
      <path d="M3 -1 L6 3 L3 7 L0 3Z" fill="currentColor" />
      <path d="M3 3 L-2 -2 M3 3 L8 -2 M3 3 L-2 8" {...S} strokeWidth=".8" />
      {/* arco acuto traforato */}
      <path d="M14 58 Q14 30 40 14 M20 58 Q20 36 40 21" {...S} strokeWidth=".9" />
      {/* spine lungo i bordi */}
      {[22, 32, 42, 52].map((p) => (
        <g key={p}>
          <path d={`M${p} 8 L${p + 2.5} 15 L${p + 5} 8`} fill="currentColor" fillOpacity=".8" />
          <path d={`M8 ${p} L15 ${p + 2.5} L8 ${p + 5}`} fill="currentColor" fillOpacity=".8" />
        </g>
      ))}
    </svg>
  );
}

/** Angoli ornamentali: va messo dentro un contenitore con position: relative. */
export function Corners({ size = 40, inset = 6 }: { size?: number; inset?: number }) {
  const pos = (t: string, extra: React.CSSProperties) => (
    <span key={t} aria-hidden="true" style={{ position: 'absolute', lineHeight: 0, pointerEvents: 'none', transform: t, ...extra }}>
      <CornerSvg size={size} />
    </span>
  );
  return (
    <>
      {pos('none', { top: inset, left: inset })}
      {pos('scaleX(-1)', { top: inset, right: inset })}
      {pos('scaleY(-1)', { bottom: inset, left: inset })}
      {pos('scale(-1,-1)', { bottom: inset, right: inset })}
    </>
  );
}

/** Separatore: loggiato di archetti gotici con una croce fra due falci di luna. */
export function ArchDivider({ width = 260 }: { width?: number }) {
  const arch = (x: number) => <path key={x} d={`M${x} 19 V13 Q${x} 7 ${x + 6} 2 Q${x + 12} 7 ${x + 12} 13 V19`} {...S} strokeWidth=".9" />;
  const left = [0, 14, 28, 42, 56, 70, 84].map(arch);
  const right = [0, 14, 28, 42, 56, 70, 84].map((x) => arch(x + 164));
  const moon = (cx: number, flip: boolean) => (
    <path d={`M${cx} 4 A6 6 0 1 ${flip ? 1 : 0} ${cx} 16 A4.6 4.6 0 1 ${flip ? 0 : 1} ${cx} 4Z`} fill="currentColor" />
  );
  return (
    <svg className="orn" aria-hidden="true" viewBox="0 0 260 22" width={width} height={(width * 22) / 260} style={{ display: 'block' }}>
      {left}{right}
      {moon(112, false)}{moon(148, true)}
      <path d="M130 1 V20 M123 8 H137" {...S} strokeWidth="1.3" />
      <circle cx="130" cy="1.5" r="1.7" fill="currentColor" /><circle cx="123" cy="8" r="1.7" fill="currentColor" /><circle cx="137" cy="8" r="1.7" fill="currentColor" />
    </svg>
  );
}

/** Rosone a sole nero: dodici trafori ad arco acuto, quadrilobo al centro, corona di raggi appuntiti. */
export function Rosette({ size = 76 }: { size?: number }) {
  const k = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg className="orn" aria-hidden="true" viewBox="-50 -50 100 100" width={size} height={size} style={{ display: 'block' }}>
      {k.map((a) => <path key={'r' + a} d="M-3 -43 L0 -49.5 L3 -43Z" fill="currentColor" transform={`rotate(${a + 15})`} />)}
      <circle r="42" {...S} strokeWidth="1.2" />
      <circle r="38" {...S} strokeWidth=".6" />
      {k.map((a) => <path key={'p' + a} d="M0 -15 Q-7.5 -24 0 -35 Q7.5 -24 0 -15Z" {...S} strokeWidth=".9" fill="currentColor" fillOpacity=".12" transform={`rotate(${a})`} />)}
      <circle r="13" fill="currentColor" fillOpacity=".85" />
      {[[0, -5], [0, 5], [-5, 0], [5, 0]].map(([x, y]) => <circle key={x + ',' + y} cx={x} cy={y} r="3.6" fill="var(--color-bg)" stroke="var(--color-bg)" strokeWidth=".4" />)}
    </svg>
  );
}
