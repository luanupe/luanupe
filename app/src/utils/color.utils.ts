/**
 * Hex colors aligned with GitHub Linguist (subset). Keys are lowercase.
 * @see https://github.com/github/linguist/blob/master/lib/linguist/languages.yml
 */
const LINGUIST_HEX: Record<string, string> = {
  abap: '#E8274B',
  actionscript: '#882B0F',
  ada: '#02f88c',
  agda: '#315665',
  'asp.net': '#9400ff',
  assembly: '#6E4C13',
  awk: '#c30e9e',
  bash: '#89e051',
  basic: '#ff0000',
  c: '#555555',
  'c#': '#178600',
  'c++': '#f34b7d',
  clojure: '#db5855',
  coffeescript: '#244776',
  crystal: '#000100',
  css: '#663399',
  dart: '#00B4AB',
  dockerfile: '#384d54',
  elixir: '#6e4a7e',
  elm: '#60B5CC',
  erlang: '#B83998',
  fsharp: '#b845fc',
  gleam: '#ffaff3',
  go: '#00ADD8',
  graphql: '#e10098',
  groovy: '#4298b8',
  hack: '#878787',
  haskell: '#5e5086',
  html: '#e34c26',
  java: '#b07219',
  javascript: '#f1e05a',
  json: '#292929',
  julia: '#a270ba',
  kotlin: '#A97BFF',
  latex: '#3D6117',
  lua: '#000080',
  markdown: '#083fa1',
  nim: '#ffc200',
  nix: '#7e7eff',
  objectivec: '#438eff',
  ocaml: '#ef7910',
  perl: '#0298c3',
  php: '#4F5D95',
  powershell: '#012456',
  prolog: '#74283c',
  python: '#3572A5',
  r: '#198CE7',
  racket: '#3c5caa',
  ruby: '#701516',
  rust: '#dea584',
  scala: '#c22d40',
  shell: '#89e051',
  solidity: '#AA6746',
  sql: '#e38c00',
  svelte: '#ff3e00',
  swift: '#F05138',
  systemverilog: '#DAE1C2',
  tex: '#3D6117',
  toml: '#9c4221',
  typescript: '#3178c6',
  typst: '#239dad',
  v: '#4f87c4',
  verilog: '#b2b7f8',
  vhdl: '#adb2cb',
  vimscript: '#199f4b',
  vue: '#41b883',
  zig: '#ec915c',
  hcl: '#844fba',
  jsx: '#f1e05a',
  tsx: '#3178c6',
}

/** Short names sometimes returned as primary language on repos. */
const ALIASES: Record<string, keyof typeof LINGUIST_HEX> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  golang: 'go',
  objc: 'objectivec',
  'objective-c': 'objectivec',
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Deterministic HSL for unknown language names (safe in SVG fill). */
function fallbackColor(name: string): string {
  const h = hashString(name.toLowerCase())
  const hue = h % 360
  const sat = 42 + (h % 25)
  const light = 44 + (h % 18)
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

/**
 * Linguist-style color for a language label, or a deterministic fallback.
 */
export function languageColorHex(name: string): string {
  const raw = name.trim().toLowerCase()
  if (raw === 'others') {
    return '#6e7681'
  }
  const fromAlias = ALIASES[raw]
  if (fromAlias && LINGUIST_HEX[fromAlias]) {
    return LINGUIST_HEX[fromAlias]
  }
  if (LINGUIST_HEX[raw]) {
    return LINGUIST_HEX[raw]
  }
  const compact = raw.replaceAll(/\s+/g, '')
  if (LINGUIST_HEX[compact]) {
    return LINGUIST_HEX[compact]
  }
  return fallbackColor(name)
}
