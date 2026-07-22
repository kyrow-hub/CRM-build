const TONES = ['blue', 'purple', 'teal', 'orange', 'pink', 'green']

export function avatarTone(name) {
  const str = name || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return TONES[hash % TONES.length]
}
