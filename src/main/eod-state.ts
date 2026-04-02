let eodSummaryShownDate: string | null = null

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isEodSummaryShownToday(): boolean {
  return eodSummaryShownDate === getTodayStr()
}

export function markEodSummaryShown(): void {
  eodSummaryShownDate = getTodayStr()
}
