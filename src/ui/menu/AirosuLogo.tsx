import type { ButtonHTMLAttributes, Ref } from 'react';

/** The pink triangle-textured disc with a white ring — airosu's take on the osu! cookie. */
export function AirosuLogo({
  className = '',
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button ref={ref} type="button" className={`airosu-logo ${className}`} {...props}>
      <span className="airosu-logo__face">
        <span className="airosu-logo__text">airosu!</span>
      </span>
    </button>
  );
}
