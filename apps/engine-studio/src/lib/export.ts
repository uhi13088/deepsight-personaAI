/**
 * Export Utilities - CSV/JSON 내보내기 유틸리티
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExportData = Record<string, any>[] | readonly Record<string, any>[]

/**
 * Convert data array to CSV string
 */
export function convertToCSV(data: ExportData, columns?: { key: string; label: string }[]): string {
  if (data.length === 0) return ""

  // Determine columns from first item if not provided
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }))

  // Create header row
  const header = cols.map((col) => escapeCSVField(col.label)).join(",")

  // Create data rows
  const rows = data.map((item) =>
    cols
      .map((col) => {
        const value = item[col.key]
        return escapeCSVField(formatValue(value))
      })
      .join(",")
  )

  return [header, ...rows].join("\n")
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format value for export
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/**
 * Download data as CSV file
 */
export function downloadCSV(
  data: ExportData,
  filename: string,
  columns?: { key: string; label: string }[]
): void {
  const csv = convertToCSV(data, columns)
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }) // BOM for Excel compatibility
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
  downloadBlob(blob, `${filename}.json`)
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string): string {
  const now = new Date()
  const timestamp = now.toISOString().split("T")[0] // YYYY-MM-DD
  return `${prefix}_${timestamp}`
}
