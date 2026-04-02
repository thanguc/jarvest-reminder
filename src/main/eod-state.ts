let eodSummaryShownDate: string | null = null

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function isEodSummaryShownToday(): boolean {
  return eodSummaryShownDate === getTodayStr()
}

export function markEodSummaryShown(): void {
  eodSummaryShownDate = getTodayStr()
}
