export function Avatar({ name, src, className = 'size-14 text-lg' }: { name: string; src?: string; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return src
    ? <img src={src} alt="" className={`shrink-0 rounded-2xl object-cover ring-2 ring-linen ${className}`} />
    : <span aria-hidden className={`grid shrink-0 place-items-center rounded-2xl bg-sage font-semibold text-forest-deep ring-2 ring-linen ${className}`}>{initials}</span>
}
