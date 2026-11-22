export function Mochi({ size = 220, className = '', float = true, small = false, flip = false }) {
  return (
    <img
      className={`mochi ${float ? 'mochi-float' : ''} ${className}`}
      src={`${import.meta.env.BASE_URL}brand/${small ? 'mochi-sm' : 'mochi'}.webp`}
      alt="Mochi, the GenLayer mascot: a cat in an astronaut helmet"
      style={{ height: size, transform: flip ? 'scaleX(-1)' : undefined }}
      draggable="false"
      loading="lazy"
    />
  );
}

/** Mochi with a speech bubble: used for empty states and hints. */
export function MochiSays({ title, children, actions, size = 170 }) {
  return (
    <div className="mochi-says">
      <Mochi size={size} small={size < 200} />
      <div className="bubble">
        {title && <h3>{title}</h3>}
        <div>{children}</div>
        {actions && <div className="row gap-sm wrap" style={{ marginTop: 14 }}>{actions}</div>}
      </div>
    </div>
  );
}
