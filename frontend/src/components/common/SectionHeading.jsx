export function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2 className="section-heading mt-2">{title}</h2>{description ? <p className="muted-copy mt-2 max-w-2xl text-sm sm:text-base">{description}</p> : null}</div>{action}</div>;
}

