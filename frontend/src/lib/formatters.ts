export function formatCompactNumber(n: number) {
  return Intl.NumberFormat(undefined, { notation: 'compact' }).format(n);
}

export function formatFullNumber(n: number) {
  return Intl.NumberFormat().format(n);
}
