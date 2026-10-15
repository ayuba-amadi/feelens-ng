export function PageIntro({ eyebrow, title, description, children }) {
  return <div className="max-w-3xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1>{description ? <p className="muted-copy mt-3 text-base">{description}</p> : null}{children}</div>;
}

