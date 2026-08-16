export default function ComingSoon({
  badge = 'מסלול IMPACT',
  title = 'המסך בבנייה',
  description = 'המסך הזה בתהליך — נחזור אליו בקרוב.',
}) {
  return (
    <div className="coming-soon">
      <span className="coming-soon__badge">{badge}</span>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{title}</h1>
      <p style={{ color: 'var(--ink-soft)', maxWidth: '30ch', lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
