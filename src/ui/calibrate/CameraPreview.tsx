import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Mirrors the shared cv session <video> into this component. */
export function CameraPreview({
  video,
  mirror,
  children,
}: {
  video: HTMLVideoElement;
  mirror: boolean;
  children?: ReactNode;
}) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    holder.prepend(video);
    return () => {
      video.remove();
    };
  }, [video]);

  return (
    <div
      style={{
        position: 'relative',
        width: 640,
        maxWidth: '90vw',
        aspectRatio: '4 / 3',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div
        ref={holderRef}
        style={{
          position: 'absolute',
          inset: 0,
          transform: mirror ? 'scaleX(-1)' : undefined,
        }}
      />
      {children}
    </div>
  );
}
