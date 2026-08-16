// Shared number formatting for stat-heavy screens (Home, Challenges, Impact...).

export function formatNumber(n) {
  return n.toLocaleString('he-IL');
}

// 6800000 -> "6.8M", 10000000 -> "10M", 92400 -> "92.4K"
export function formatCompact(n) {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}K`;
  }
  return String(n);
}
