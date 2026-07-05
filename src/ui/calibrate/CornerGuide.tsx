/** Pulsing target over the camera preview showing where to hold the hand. */
export function CornerGuide({ corner }: { corner: 'top-left' | 'bottom-right' }) {
  const tl = corner === 'top-left';
  const pos = tl ? { left: '18%', top: '18%' } : { left: '82%', top: '82%' };
  return (
    <>
      <div className="corner-target" style={pos}>
        <div className="corner-target__dot" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: pos.left,
          top: `calc(${pos.top} ${tl ? '+' : '-'} 52px)`,
          transform: `translate(-50%, ${tl ? '0' : '-100%'})`,
          background: 'rgba(23, 17, 31, 0.85)',
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        Hold your hand here
      </div>
    </>
  );
}
