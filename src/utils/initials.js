export function initials(name) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/[a-z]/i)?.[0])
    .filter(Boolean)
  return letters.slice(0, 2).join('').toUpperCase()
}
