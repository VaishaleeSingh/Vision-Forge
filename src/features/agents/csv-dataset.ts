/** CSV parsing + statistical analysis for ML orchestration (browser + server safe) */

export type ColumnKind = 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'id' | 'empty'

export type CsvColumnAnalysis = {
  name: string
  kind: ColumnKind
  nonEmpty: number
  missingPct: number
  uniqueCount: number
  sampleValues: string[]
  numeric?: {
    min: number
    max: number
    mean: number
    std: number
  }
  categorical?: {
    topValues: { value: string; count: number }[]
  }
  likelyTarget?: boolean
  targetReason?: string
}

export type CsvDatasetAnalysis = {
  fileName: string
  rowCount: number
  columnCount: number
  columns: CsvColumnAnalysis[]
  suggestedTarget: string | null
  suggestedProblemType: 'regression' | 'classification' | 'unknown'
  problemTypeReason: string
  qualityIssues: string[]
  recommendations: string[]
  duplicateRowEstimate: number
}

export type ParsedCsv = {
  fileName: string
  headers: string[]
  rows: string[][] // sample rows for preview / context
  totalRows: number
  analysis: CsvDatasetAnalysis
}

const TARGET_NAME_HINTS = [
  'target', 'label', 'class', 'outcome', 'y', 'churned', 'churn',
  'co_risk_level', 'risk_level', 'risk', 'loan_default', 'is_fraud',
  'defect_severity', 'phishing_label', 'fraud', 'default',
]

const ID_NAME_HINTS = ['id', 'uuid', 'index', 'row_id', 'customer_id', 'user_id']

const ANALYSIS_ROW_CAP = 800
const CONTEXT_SAMPLE_ROWS = 12

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function splitCsvLines(text: string): { headers: string[]; dataRows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { headers: [], dataRows: [] }
  }

  const delimiter =
    lines[0].includes('\t') && !lines[0].includes(',') ? '\t' : ','
  const splitLine = (line: string) =>
    delimiter === '\t'
      ? line.split('\t').map((c) => c.trim())
      : parseCsvLine(line)

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim())
  const dataRows = lines
    .slice(1)
    .slice(0, ANALYSIS_ROW_CAP)
    .map(splitLine)

  return { headers, dataRows }
}

function isNumericValue(v: string): boolean {
  if (v === '' || v == null) return false
  const n = Number(v)
  return !Number.isNaN(n) && Number.isFinite(n)
}

function isBooleanValue(v: string): boolean {
  const lower = v.toLowerCase().trim()
  return ['true', 'false', '0', '1', 'yes', 'no'].includes(lower)
}

function isDatetimeValue(v: string): boolean {
  if (!v || v.length < 8) return false
  return !Number.isNaN(Date.parse(v)) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(v)
}

function classifyColumn(
  name: string,
  values: string[],
  colIdx: number,
  headerCount: number,
): Omit<CsvColumnAnalysis, 'likelyTarget' | 'targetReason'> {
  const nonEmpty = values.filter((v) => v.length > 0)
  const missingPct =
    values.length === 0
      ? 100
      : Math.round(((values.length - nonEmpty.length) / values.length) * 1000) / 10

  const unique = new Set(nonEmpty.map((v) => v.toLowerCase()))
  const uniqueCount = unique.size
  const sampleValues = [...new Set(nonEmpty)].slice(0, 5)

  const lowerName = name.toLowerCase()
  if (ID_NAME_HINTS.some((h) => lowerName === h || lowerName.endsWith(`_${h}`))) {
    return {
      name,
      kind: 'id',
      nonEmpty: nonEmpty.length,
      missingPct,
      uniqueCount,
      sampleValues,
    }
  }

  if (nonEmpty.length === 0) {
    return { name, kind: 'empty', nonEmpty: 0, missingPct, uniqueCount: 0, sampleValues: [] }
  }

  const numericVals = nonEmpty.filter(isNumericValue).map(Number)
  const numericRatio = numericVals.length / nonEmpty.length
  const boolRatio =
    nonEmpty.filter(isBooleanValue).length / nonEmpty.length
  const dateRatio =
    nonEmpty.filter(isDatetimeValue).length / nonEmpty.length

  if (boolRatio > 0.9 && uniqueCount <= 3) {
    return {
      name,
      kind: 'boolean',
      nonEmpty: nonEmpty.length,
      missingPct,
      uniqueCount,
      sampleValues,
    }
  }

  if (dateRatio > 0.8 && numericRatio < 0.5) {
    return {
      name,
      kind: 'datetime',
      nonEmpty: nonEmpty.length,
      missingPct,
      uniqueCount,
      sampleValues,
    }
  }

  if (numericRatio >= 0.85) {
    const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length
    const variance =
      numericVals.reduce((a, b) => a + (b - mean) ** 2, 0) / numericVals.length
    return {
      name,
      kind: 'numeric',
      nonEmpty: nonEmpty.length,
      missingPct,
      uniqueCount,
      sampleValues: sampleValues.slice(0, 3),
      numeric: {
        min: Math.min(...numericVals),
        max: Math.max(...numericVals),
        mean: Math.round(mean * 1000) / 1000,
        std: Math.round(Math.sqrt(variance) * 1000) / 1000,
      },
    }
  }

  const counts = new Map<string, number>()
  for (const v of nonEmpty) {
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }))

  const kind: ColumnKind =
    uniqueCount > nonEmpty.length * 0.9 && colIdx === 0 ? 'id' : 'categorical'

  return {
    name,
    kind,
    nonEmpty: nonEmpty.length,
    missingPct,
    uniqueCount,
    sampleValues,
    categorical: { topValues },
  }
}

function pickTargetColumn(
  columns: CsvColumnAnalysis[],
  userGoal: string,
): { target: string | null; annotated: CsvColumnAnalysis[] } {
  const goal = userGoal.toLowerCase()
  const annotated = columns.map((c) => ({ ...c }))

  for (const col of annotated) {
    if (col.kind === 'id' || col.kind === 'empty' || col.kind === 'datetime') continue
    const nameLower = col.name.toLowerCase()

    if (goal.includes(`target: ${nameLower}`) || goal.includes(`target ${col.name}`)) {
      col.likelyTarget = true
      col.targetReason = 'Named in user goal'
      return { target: col.name, annotated }
    }
    if (goal.includes(col.name.toLowerCase()) && TARGET_NAME_HINTS.some((h) => nameLower.includes(h))) {
      col.likelyTarget = true
      col.targetReason = 'Mentioned in user goal'
      return { target: col.name, annotated }
    }
  }

  for (const col of annotated) {
    const nameLower = col.name.toLowerCase()
    if (TARGET_NAME_HINTS.some((h) => nameLower.includes(h))) {
      if (col.kind !== 'id' && col.kind !== 'empty') {
        col.likelyTarget = true
        col.targetReason = 'Column name suggests target variable'
        return { target: col.name, annotated }
      }
    }
  }

  const candidates = annotated.filter(
    (c) => c.kind === 'numeric' || c.kind === 'categorical' || c.kind === 'boolean',
  )
  const last = candidates[candidates.length - 1]
  if (last) {
    last.likelyTarget = true
    last.targetReason = 'Last suitable column (heuristic)'
    return { target: last.name, annotated }
  }

  return { target: null, annotated }
}

function inferProblemType(
  targetCol: CsvColumnAnalysis | undefined,
): { type: CsvDatasetAnalysis['suggestedProblemType']; reason: string } {
  if (!targetCol) {
    return { type: 'unknown', reason: 'No target column identified — specify target in your goal.' }
  }

  if (targetCol.kind === 'numeric' && targetCol.numeric) {
    const unique = targetCol.uniqueCount
    if (unique <= 15 && unique < targetCol.nonEmpty * 0.05) {
      return {
        type: 'classification',
        reason: `Target "${targetCol.name}" is numeric but has only ${unique} distinct values — treat as classification.`,
      }
    }
    return {
      type: 'regression',
      reason: `Target "${targetCol.name}" is continuous numeric — regression.`,
    }
  }

  if (targetCol.kind === 'categorical' || targetCol.kind === 'boolean') {
    const classes = targetCol.uniqueCount
    if (classes === 2) {
      return {
        type: 'classification',
        reason: `Binary target "${targetCol.name}" (${classes} classes) — classification.`,
      }
    }
    if (classes > 2 && classes <= 50) {
      return {
        type: 'classification',
        reason: `Target "${targetCol.name}" has ${classes} categories — multi-class classification.`,
      }
    }
    if (classes > 50) {
      return {
        type: 'regression',
        reason: `Target "${targetCol.name}" has many unique labels — consider regression or re-labeling.`,
      }
    }
  }

  return { type: 'unknown', reason: 'Could not infer problem type from target column.' }
}

export function analyzeCsvDataset(
  fileName: string,
  headers: string[],
  dataRows: string[][],
  totalRows: number,
  userGoal = '',
): CsvDatasetAnalysis {
  const qualityIssues: string[] = []
  const recommendations: string[] = []

  if (headers.length === 0) {
    return {
      fileName,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      suggestedTarget: null,
      suggestedProblemType: 'unknown',
      problemTypeReason: 'Empty or invalid CSV',
      qualityIssues: ['No headers found'],
      recommendations: ['Upload a valid CSV with a header row'],
      duplicateRowEstimate: 0,
    }
  }

  const rowKeys = new Set<string>()
  let duplicateRowEstimate = 0
  for (const row of dataRows) {
    const key = row.join('\x00')
    if (rowKeys.has(key)) duplicateRowEstimate++
    else rowKeys.add(key)
  }
  if (duplicateRowEstimate > 0) {
    qualityIssues.push(`~${duplicateRowEstimate} duplicate rows in analyzed sample`)
    recommendations.push('Drop duplicate rows during preprocessing')
  }

  const columnsRaw = headers.map((name, colIdx) => {
    const values = dataRows.map((r) => (r[colIdx] ?? '').trim())
    return classifyColumn(name, values, colIdx, headers.length)
  })

  const { target, annotated } = pickTargetColumn(columnsRaw, userGoal)
  const targetCol = annotated.find((c) => c.likelyTarget)

  for (const col of annotated) {
    if (col.missingPct > 30) {
      qualityIssues.push(`Column "${col.name}" has ${col.missingPct}% missing values`)
      recommendations.push(`Impute or drop "${col.name}" (${col.missingPct}% missing)`)
    }
    if (col.kind === 'id') {
      recommendations.push(`Exclude ID column "${col.name}" from features`)
    }
  }

  const { type: suggestedProblemType, reason: problemTypeReason } =
    inferProblemType(targetCol)

  if (targetCol?.kind === 'categorical' && targetCol.categorical) {
    const top = targetCol.categorical.topValues[0]
    const total = targetCol.nonEmpty || 1
    if (top && top.count / total > 0.85) {
      qualityIssues.push(`Severe class imbalance on target "${targetCol.name}"`)
      recommendations.push('Use stratified split / class weights for imbalanced target')
    }
  }

  if (!userGoal.trim() && target) {
    recommendations.push(
      `Add a goal, e.g. "Predict ${target}" or "Classify ${target} from other features"`,
    )
  }

  if (totalRows < 50) {
    qualityIssues.push(`Small dataset (${totalRows} rows) — metrics may be unstable`)
    recommendations.push('Consider cross-validation and avoid complex models')
  }

  return {
    fileName,
    rowCount: totalRows,
    columnCount: headers.length,
    columns: annotated,
    suggestedTarget: target,
    suggestedProblemType,
    problemTypeReason,
    qualityIssues,
    recommendations,
    duplicateRowEstimate,
  }
}

export function parseCsvContent(text: string, fileName: string, userGoal = ''): ParsedCsv {
  const { headers, dataRows } = splitCsvLines(text)
  const totalRows = text.split(/\r?\n/).filter((l) => l.trim()).length - 1
  const analysis = analyzeCsvDataset(fileName, headers, dataRows, Math.max(0, totalRows), userGoal)

  return {
    fileName,
    headers,
    rows: dataRows.slice(0, 25),
    totalRows: Math.max(0, totalRows),
    analysis,
  }
}

export function formatDatasetAnalysisReport(analysis: CsvDatasetAnalysis): string {
  if (analysis.columnCount === 0) {
    return 'Could not parse this CSV. Check that the first row contains column headers.'
  }

  const columnLines = analysis.columns
    .map((c) => {
      const targetTag = c.likelyTarget ? ' **← suggested target**' : ''
      let stats = `type=${c.kind}, missing=${c.missingPct}%, unique=${c.uniqueCount}`
      if (c.numeric) {
        stats += `, range=[${c.numeric.min}–${c.numeric.max}], mean=${c.numeric.mean}`
      }
      if (c.categorical?.topValues.length) {
        const tops = c.categorical.topValues
          .slice(0, 3)
          .map((t) => `${t.value}(${t.count})`)
          .join(', ')
        stats += `, top: ${tops}`
      }
      return `- **${c.name}**${targetTag}: ${stats}${c.targetReason ? ` — ${c.targetReason}` : ''}`
    })
    .join('\n')

  const issues =
    analysis.qualityIssues.length > 0
      ? analysis.qualityIssues.map((i) => `- ⚠ ${i}`).join('\n')
      : '- None critical in sample'

  const recs =
    analysis.recommendations.length > 0
      ? analysis.recommendations.map((r) => `- ${r}`).join('\n')
      : '- Dataset looks ready for modeling'

  return `## Dataset analysis: ${analysis.fileName}

**Shape:** ${analysis.rowCount.toLocaleString()} rows × ${analysis.columnCount} columns  
**Suggested problem:** ${analysis.suggestedProblemType} — ${analysis.problemTypeReason}  
**Suggested target:** ${analysis.suggestedTarget ?? '(specify in your goal)'}

### Columns
${columnLines}

### Data quality
${issues}

### Recommendations
${recs}`
}

export function formatCsvForMlContext(dataset: ParsedCsv, userGoal = ''): string {
  if (dataset.headers.length === 0) {
    return '### Attached dataset\n(Could not parse CSV — check file format.)'
  }

  const analysisBlock = formatDatasetAnalysisReport(dataset.analysis)

  const headerRow = dataset.headers.join(' | ')
  const sampleRows = dataset.rows
    .slice(0, CONTEXT_SAMPLE_ROWS)
    .map((row, i) => `${i + 1}. ${row.map((c) => c || '—').join(' | ')}`)
    .join('\n')

  return `### STATISTICAL DATASET PROFILE (use these facts in every pipeline step — do not give generic advice)

${analysisBlock}

### Sample rows (first ${Math.min(CONTEXT_SAMPLE_ROWS, dataset.rows.length)})
| ${headerRow} |
${sampleRows}

**Instructions for agents:** Reference actual column names, missing percentages, target column, and problem type from the profile above. Tailor preprocessing, model choice, metrics, and code to this dataset.`
}

