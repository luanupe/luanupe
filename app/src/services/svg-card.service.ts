import { formatNumber } from '../utils/number.utils'
import { formatDateTime } from '../utils/date.utils'
import { languageColorHex } from '../utils/color.utils'
import { escapeXml, svgShell } from '../utils/xml.utils'

import type { GitHubStats } from '../usecases/github-stats.usecase.types'

import type {
  GitHubCharts,
  GitHubMonthlyChartPoint,
  GitHubYearlyChartPoint,
} from '../usecases/github-charts.usecase.types'

/** Same width for all cards so they align side-by-side on GitHub; content uses edges with small pad. */
const CARD_W = 460
const PAD = 10
const CX = CARD_W / 2

/** Pixel widths for stacked bar segments; fixes rounding so sum equals `total`. */
function distributeSegmentWidths(percentages: number[], total: number): number[] {
  const n = percentages.length
  if (n === 0) {
    return []
  }
  if (n === 1) {
    return [total]
  }
  const weights = percentages.map((p) => (p / 100) * total)
  const floors = weights.map((w) => Math.floor(w))
  let remainder = total - floors.reduce((a, b) => a + b, 0)
  const order = weights
    .map((w, i) => i)
    .sort((i, j) => weights[j] - Math.floor(weights[j]) - (weights[i] - Math.floor(weights[i])) || weights[j] - weights[i])
  const out = [...floors]
  let k = 0
  while (remainder > 0) {
    out[order[k % n]!]! += 1
    remainder -= 1
    k += 1
  }
  for (let i = 0; i < n; i += 1) {
    if (percentages[i]! > 0 && out[i] === 0) {
      const donor = out.indexOf(Math.max(...out))
      if (donor >= 0 && out[donor]! > 1) {
        out[donor]! -= 1
        out[i]! += 1
      }
    }
  }
  return out
}

function truncateLegendLabel(name: string, maxChars: number): string {
  if (name.length <= maxChars) {
    return name
  }
  return `${name.slice(0, Math.max(1, maxChars - 1))}…`
}

function monthYearTickLabel(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
}

function svgStatMetric(
  x: number,
  y: number,
  label: string,
  value: string,
  iconType: 'repos' | 'prsYear' | 'contribYear' | 'topYear' | 'totalPrs' | 'totalContribs',
): string {
  const iconX = x
  const iconY = y - 8
  const icon = (() => {
    switch (iconType) {
      case 'repos':
        return `<rect x="${iconX + 1}" y="${iconY + 1}" width="4.5" height="3" rx="0.7" fill="#21262d" stroke="#58a6ff" stroke-width="1"/>
  <rect x="${iconX + 1}" y="${iconY + 3.5}" width="8" height="6.5" rx="1.1" fill="#21262d" stroke="#58a6ff" stroke-width="1"/>`
      case 'prsYear':
        return `<path d="M${iconX + 1} ${iconY + 3} L${iconX + 7} ${iconY + 3} L${iconX + 5} ${iconY + 1}" stroke="#58a6ff" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${iconX + 9} ${iconY + 8} L${iconX + 3} ${iconY + 8} L${iconX + 5} ${iconY + 10}" stroke="#58a6ff" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${iconX + 7} ${iconY + 3} L${iconX + 5} ${iconY + 5}" stroke="#58a6ff" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M${iconX + 3} ${iconY + 8} L${iconX + 5} ${iconY + 6}" stroke="#58a6ff" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
      case 'contribYear':
        return `<rect x="${iconX}" y="${iconY + 3}" width="3" height="7" rx="1" fill="#58a6ff"/>
  <rect x="${iconX + 4}" y="${iconY + 1}" width="3" height="9" rx="1" fill="#58a6ff"/>
  <rect x="${iconX + 8}" y="${iconY + 5}" width="3" height="5" rx="1" fill="#58a6ff"/>`
      case 'topYear':
        return `<path d="M${iconX + 5} ${iconY + 1.2} L${iconX + 6.45} ${iconY + 4.1} L${iconX + 9.4} ${iconY + 4.6} L${iconX + 7.15} ${iconY + 6.75} L${iconX + 7.95} ${iconY + 9.6} L${iconX + 5} ${iconY + 8.05} L${iconX + 2.05} ${iconY + 9.6} L${iconX + 2.85} ${iconY + 6.75} L${iconX + 0.6} ${iconY + 4.6} L${iconX + 3.55} ${iconY + 4.1} Z" fill="#f1e05a"/>`
      case 'totalPrs':
        return `<circle cx="${iconX + 3}" cy="${iconY + 4}" r="1.8" fill="#58a6ff"/>
  <circle cx="${iconX + 9}" cy="${iconY + 4}" r="1.8" fill="#58a6ff"/>
  <circle cx="${iconX + 6}" cy="${iconY + 9}" r="1.8" fill="#58a6ff"/>
  <path d="M${iconX + 5} ${iconY + 5} L${iconX + 7} ${iconY + 5} M${iconX + 4.2} ${iconY + 5.8} L${iconX + 5.1} ${iconY + 7.5} M${iconX + 7.8} ${iconY + 5.8} L${iconX + 6.9} ${iconY + 7.5}" stroke="#58a6ff" stroke-width="0.9"/>`
      case 'totalContribs':
        return `<path d="M${iconX + 0.5} ${iconY + 9.5} L${iconX + 3} ${iconY + 6.5} L${iconX + 6} ${iconY + 8} L${iconX + 9.5} ${iconY + 3.5}" stroke="#58a6ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <circle cx="${iconX + 9.5}" cy="${iconY + 3.5}" r="1.4" fill="#58a6ff"/>`
    }
  })()

  return `${icon}
  <text class="small" x="${x + 16}" y="${y}">${escapeXml(label)}</text>
  <text class="value" x="${x + 16}" y="${y + 20}">${escapeXml(value)}</text>`
}

export class SvgCardService {
  renderStatsCard(stats: GitHubStats): string {
    const repositories = stats.repositories.total
    const yearLabel = String(stats.contributions.year)
    const currentYearContributions = stats.contributions.total + stats.contributions.restricted
    const c1 = PAD
    const c2 = PAD + 150
    const c3 = PAD + 300
    const row1 = 68
    const row2 = 126

    return svgShell({
      width: CARD_W,
      height: 195,
      children: `<text class="title" x="${PAD}" y="34">${escapeXml(stats.profile.name || stats.profile.login)}'s GitHub stats</text>
  ${svgStatMetric(c1, row1, 'Repos', formatNumber(repositories), 'repos')}
  ${svgStatMetric(c2, row1, `${yearLabel} PRs`, formatNumber(stats.contributions.pullRequests), 'prsYear')}
  ${svgStatMetric(c3, row1, `${yearLabel} contributions`, formatNumber(currentYearContributions), 'contribYear')}
  ${svgStatMetric(c1, row2, 'Top year', String(stats.history.topYear), 'topYear')}
  ${svgStatMetric(c2, row2, 'Total PRs', formatNumber(stats.history.totalPullRequests), 'totalPrs')}
  ${svgStatMetric(c3, row2, 'Total contributions', formatNumber(stats.history.totalContributions), 'totalContribs')}
  <text class="footnote" text-anchor="middle" x="${CX}" y="176">Last updated at ${escapeXml(formatDateTime(stats.generatedAt))}</text>`,
    })
  }

  renderTopLanguagesCard(stats: GitHubStats): string {
    const all = stats.languages
    const top = all.slice(0, 7)
    const totalBytes = all.reduce((s, l) => s + l.bytes, 0)
    const othersBytes = all.slice(7).reduce((s, l) => s + l.bytes, 0)
    const languages =
      othersBytes > 0 && totalBytes > 0
        ? [
            ...top,
            {
              name: 'Others',
              bytes: othersBytes,
              percentage: Number(((othersBytes / totalBytes) * 100).toFixed(2)),
            },
          ]
        : top
    const barY = 48
    const barH = Math.round(16 * 0.7)
    const barW = CARD_W - 2 * PAD
    const barX = PAD
    const clipId = 'tlBarClip'
    const percentages = languages.map((l) => l.percentage)
    const segmentWidths = distributeSegmentWidths(percentages, barW)

    let segX = barX
    const segmentRects = languages
      .map((language, i) => {
        const w = segmentWidths[i] ?? 0
        const fill = languageColorHex(language.name)
        const rect = `<rect x="${segX}" y="${barY}" width="${w}" height="${barH}" fill="${fill}"/>`
        segX += w
        return rect
      })
      .join('\n  ')

    const colGap = 16
    const colW = (CARD_W - 2 * PAD - colGap) / 2
    const barLegendGap = 26
    const legendY0 = barY + barH + barLegendGap
    const rowPitch = 24
    const maxNameChars = 22
    const leftColX = PAD
    const rightColX = PAD + colW + colGap
    const rowCount = Math.ceil(languages.length / 2)

    const legendRows: string[] = []
    for (let row = 0; row < rowCount; row += 1) {
      const y = legendY0 + row * rowPitch
      const left = languages[row * 2]
      const right = languages[row * 2 + 1]
      if (left) {
        const label = truncateLegendLabel(left.name, maxNameChars)
        const fill = languageColorHex(left.name)
        legendRows.push(
          `<rect x="${leftColX}" y="${y - 10}" width="10" height="10" rx="2" fill="${fill}"/>
  <text class="label" x="${leftColX + 16}" y="${y}"><tspan>${escapeXml(label)}</tspan> <tspan class="small">${escapeXml(left.percentage.toFixed(2))}%</tspan></text>`,
        )
      }
      if (right) {
        const label = truncateLegendLabel(right.name, maxNameChars)
        const fill = languageColorHex(right.name)
        legendRows.push(
          `<rect x="${rightColX}" y="${y - 10}" width="10" height="10" rx="2" fill="${fill}"/>
  <text class="label" x="${rightColX + 16}" y="${y}"><tspan>${escapeXml(label)}</tspan> <tspan class="small">${escapeXml(right.percentage.toFixed(2))}%</tspan></text>`,
        )
      }
    }

    const footY = legendY0 + rowCount * rowPitch + 14
    const cardH = footY + 14

    return svgShell({
      width: CARD_W,
      height: cardH,
      children: `  <defs>
    <clipPath id="${clipId}">
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}"/>
    </clipPath>
  </defs>
  <text class="title" x="${PAD}" y="34">Top languages</text>
  <g clip-path="url(#${clipId})">
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="#30363d"/>
    ${segmentRects}
  </g>
  ${legendRows.join('\n  ')}
  <text class="footnote" text-anchor="middle" x="${CX}" y="${footY}">Based on accessible repository language bytes</text>`,
    })
  }

  renderChartsCard(charts: GitHubCharts): string {
    const maxYearlyTotal = Math.max(1, ...charts.yearly.map((point) => point.total + point.restricted))
    const maxMonthlyTotal = Math.max(1, ...charts.monthly.map((point) => point.total + point.restricted))
    const yearlyCount = charts.yearly.length
    const yearlyAreaW = CARD_W - 2 * PAD
    const yearlyBarW = Math.max(
      16,
      Math.min(48, Math.floor((yearlyAreaW - 6 * Math.max(0, yearlyCount - 1)) / Math.max(1, yearlyCount))),
    )
    const yearlyGap = yearlyCount > 1 ? Math.floor((yearlyAreaW - yearlyBarW * yearlyCount) / (yearlyCount - 1)) : 0
    const yearlyBars = charts.yearly
      .map((point: GitHubYearlyChartPoint, index: number) => {
        const value = point.total + point.restricted
        const x = PAD + index * (yearlyBarW + yearlyGap)
        const cx = x + yearlyBarW / 2
        const height = Math.max(4, Math.round((value / maxYearlyTotal) * 76))
        const y = 126 - height

        return `<rect x="${x}" y="${y}" width="${yearlyBarW}" height="${height}" rx="5" fill="#58a6ff"/>
  <text class="small" text-anchor="middle" x="${cx}" y="148">${point.year}</text>
  <text class="small" text-anchor="middle" x="${cx}" y="${Math.max(42, y - 8)}">${escapeXml(formatNumber(value))}</text>`
      })
      .join('\n  ')

    const recentMonths = charts.monthly.slice(-12)
    const monthBarW = 22
    const monthBars = recentMonths
      .map((point: GitHubMonthlyChartPoint, index: number) => {
        const value = point.total + point.restricted
        const x = PAD + index * 38
        const cx = x + monthBarW / 2
        const height = Math.max(3, Math.round((value / maxMonthlyTotal) * 44))
        const y = 218 - height
        const tick = monthYearTickLabel(point.year, point.month)

        return `<rect x="${x}" y="${y}" width="${monthBarW}" height="${height}" rx="4" fill="#3fb950"/>
  <text class="monthTick" text-anchor="middle" x="${cx}" y="236">${escapeXml(tick)}</text>`
      })
      .join('\n  ')

    return svgShell({
      width: CARD_W,
      height: 260,
      children: `<text class="title" x="${PAD}" y="34">Contribution charts</text>
  <text class="label" x="${PAD}" y="58">Yearly evolution (${charts.range.years} years)</text>
  ${yearlyBars}
  <text class="label" x="${PAD}" y="178">Monthly evolution (last ${charts.range.months} months)</text>
  ${monthBars}
  <text class="footnote" text-anchor="middle" x="${CX}" y="252">Last updated at ${escapeXml(formatDateTime(charts.generatedAt))}</text>`,
    })
  }
}
