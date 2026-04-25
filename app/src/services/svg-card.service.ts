import { formatDateTime } from '../utils/date.utils'
import { languageColorHex } from '../utils/language-color.utils'
import { formatNumber } from '../utils/number.utils'
import { escapeXml, svgMetric, svgShell } from '../utils/xml.utils'

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

export class SvgCardService {
  renderStatsCard(stats: GitHubStats): string {
    const repositories = stats.repositories.total
    const privateRepos = stats.repositories.private
    const contributions = stats.contributions.total + stats.contributions.restricted
    const c1 = PAD
    const c2 = PAD + 156
    const c3 = PAD + 312

    return svgShell({
      width: CARD_W,
      height: 195,
      children: `<text class="title" x="${PAD}" y="34">${escapeXml(stats.profile.name || stats.profile.login)}'s GitHub stats</text>
  ${svgMetric(c1, 68, 'Total repos', formatNumber(repositories))}
  ${svgMetric(c2, 68, 'Private repos', formatNumber(privateRepos))}
  ${svgMetric(c3, 68, 'Stars', formatNumber(stats.repositories.stargazers))}
  ${svgMetric(c1, 126, `${stats.contributions.year} contributions`, formatNumber(contributions))}
  ${svgMetric(c2, 126, 'Pull requests', formatNumber(stats.contributions.pullRequests))}
  ${svgMetric(c3, 126, 'Followers', formatNumber(stats.profile.followers))}
  <text class="footnote" text-anchor="middle" x="${CX}" y="176">Last updated at ${escapeXml(formatDateTime(stats.generatedAt))}</text>`,
    })
  }

  renderTopLanguagesCard(stats: GitHubStats): string {
    const languages = stats.languages.slice(0, 6)
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
    const yearlyBarW = 48
    const yearlyBars = charts.yearly
      .map((point: GitHubYearlyChartPoint, index: number) => {
        const value = point.total + point.restricted
        const x = PAD + index * 86
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
