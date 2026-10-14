import './Badge.css';

export default function Badge({ variant = 'default', children, size = 'md' }) {
  return (
    <span className={`badge badge-${variant} badge-${size}`}>
      {children}
    </span>
  );
}

// Preset badges
export function DirectionBadge({ direction }) {
  return (
    <Badge variant={direction === 'Long' ? 'teal' : 'coral'}>
      {direction}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  const variant = status === 'Win' ? 'teal' : status === 'Breakeven' ? 'amber' : 'coral';
  return (
    <Badge variant={variant}>
      {status}
    </Badge>
  );
}

export function MistakeBadge({ mistake }) {
  if (!mistake || mistake === 'None') {
    return <Badge variant="success-light">None ✓</Badge>;
  }
  return <Badge variant="amber">⚠ {mistake}</Badge>;
}
