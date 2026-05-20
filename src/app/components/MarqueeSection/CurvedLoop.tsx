'use client';
import { useRef, useEffect, useState, useMemo, useId } from 'react';
import styles from '../animations.module.css';

interface CurvedLoopProps {
  marqueeText?: string;
  speed?: number;
  curveAmount?: number;
  direction?: 'left' | 'right';
  interactive?: boolean;
  starChar?: string;
  starColor?: string;
}

// Parse text into segments: {text, isStar}[]
function parseSegments(text: string, starChar: string) {
  const parts = text.split(starChar);
  const segments: { text: string; isStar: boolean }[] = [];
  parts.forEach((p, i) => {
    if (p) segments.push({ text: p, isStar: false });
    if (i < parts.length - 1) segments.push({ text: starChar, isStar: true });
  });
  return segments;
}

export default function CurvedLoop({
  marqueeText = '✦ CREATIVE  ✦ DESIGN  ✦ CODE  ✦ ART  ',
  speed = 1.5,
  curveAmount = 120,
  direction = 'left',
  interactive = true,
  starChar = '✦',
  starColor = '#D5631A',
}: CurvedLoopProps) {
  const text = useMemo(() => {
    const t = marqueeText.replace(/\s+$/, '') + '   ';
    return t;
  }, [marqueeText]);

  const segments = useMemo(() => parseSegments(text, starChar), [text, starChar]);

  const measureRef = useRef<SVGTextElement>(null);
  const textPathRef = useRef<SVGTextPathElement>(null);
  const [spacing, setSpacing] = useState(0);
  const [offset, setOffset] = useState(0);
  const uid = useId();
  const pathId = `curve-${uid}`;
  const pathD = `M-100,40 Q700,${40 + curveAmount} 1540,40`;

  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef(direction);
  const velRef = useRef(0);

  // We repeat the full segment content
  const totalRepeat = spacing ? Math.ceil(2200 / spacing) + 2 : 3;

  const ready = spacing > 0;

  useEffect(() => {
    if (measureRef.current) setSpacing(measureRef.current.getComputedTextLength());
  }, [text]);

  useEffect(() => {
    if (!spacing) return;
    if (textPathRef.current) {
      const initial = -spacing;
      textPathRef.current.setAttribute('startOffset', initial + 'px');
      setOffset(initial);
    }
  }, [spacing]);

  useEffect(() => {
    if (!spacing || !ready) return;
    let frame = 0;
    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === 'right' ? speed : -speed;
        const current = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
        let next = current + delta;
        if (next <= -spacing) next += spacing;
        if (next > 0) next -= spacing;
        textPathRef.current.setAttribute('startOffset', next + 'px');
        setOffset(next);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, ready]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive || !dragRef.current || !textPathRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;
    const current = parseFloat(textPathRef.current.getAttribute('startOffset') || '0');
    let next = current + dx;
    if (next <= -spacing) next += spacing;
    if (next > 0) next -= spacing;
    textPathRef.current.setAttribute('startOffset', next + 'px');
    setOffset(next);
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? 'right' : 'left';
  };

  // Build repeated tspan content
  const repeatedSegments = Array(totalRepeat).fill(segments).flat();

  return (
    <div
      className={styles.marqueeSection}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg className={styles.curvedSvg} viewBox="0 0 1440 120">
        {/* Measurement element — full plain text */}
        <text
          ref={measureRef}
          xmlSpace="preserve"
          style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none', fontSize: '5rem', fontWeight: 900 }}
        >
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready && (
          <text fontWeight="900" xmlSpace="preserve" fill="white">
            <textPath
              ref={textPathRef}
              href={`#${pathId}`}
              startOffset={offset + 'px'}
              xmlSpace="preserve"
            >
              {repeatedSegments.map((seg, i) =>
                seg.isStar ? (
                  <tspan key={i} fill={starColor}>{seg.text}</tspan>
                ) : (
                  <tspan key={i}>{seg.text}</tspan>
                )
              )}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
}
