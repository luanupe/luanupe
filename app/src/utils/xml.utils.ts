export function escapeXml(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function svgShell({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: string
}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
  <style>
    .title { fill: #58a6ff; font: 600 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .label { fill: #8b949e; font: 500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .value { fill: #c9d1d9; font: 600 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .small { fill: #8b949e; font: 500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .monthTick { fill: #8b949e; font: 500 9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .footnote { fill: #6e7681; font: 400 9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  </style>
  ${children}
</svg>`
}

export function svgMetric(x: number, y: number, label: string, value: string): string {
  return `<text class="label" x="${x}" y="${y}">${escapeXml(label)}</text>
  <text class="value" x="${x}" y="${y + 22}">${escapeXml(value)}</text>`
}
