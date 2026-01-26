export default function TagBadge({
  name,
  tag,
  size = 'md',
  clickable = false
}: {
  name?: string;
  tag?: { name?: string };
  size?: 'sm' | 'md';
  clickable?: boolean;
}) {
  const text = name ?? tag?.name ?? '';
  const sizeCls = size === 'sm' ? 'badge-sm' : '';
  const interactive = clickable ? 'cursor-pointer hover:bg-accent hover:text-white transition-colors' : '';
  return <span className={`badge badge-accent-soft ${sizeCls} ${interactive}`}>{text}</span>;
}
