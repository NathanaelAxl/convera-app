import { differenceInCalendarDays, isValid, parseISO } from "date-fns"

import type { Period } from "@/lib/api/types"

/** Urutan preset periode PRD 7.1. */
export const PERIODS = [
  "today",
  "yesterday",
  "last_3_days",
  "last_7_days",
  "last_14_days",
  "last_30_days",
  "last_90_days",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
] as const satisfies readonly Period[]

export type PeriodPreset = Exclude<Period, "custom">

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari ini",
  yesterday: "Kemarin",
  last_3_days: "3 hari terakhir",
  last_7_days: "7 hari terakhir",
  last_14_days: "14 hari terakhir",
  last_30_days: "30 hari terakhir",
  last_90_days: "90 hari terakhir",
  this_week: "Minggu ini",
  last_week: "Minggu lalu",
  this_month: "Bulan ini",
  last_month: "Bulan lalu",
  custom: "Rentang tanggal",
}

/** Label ringkas untuk varian chip. */
export const PERIOD_CHIP_LABELS: Record<Period, string> = {
  ...PERIOD_LABELS,
  last_3_days: "3 hari",
  last_7_days: "7 hari",
  last_14_days: "14 hari",
  last_30_days: "30 hari",
  last_90_days: "90 hari",
  custom: "Rentang",
}

/** Rentang kustom maksimal 366 hari [asumsi PRD 7.1]. */
export const MAX_CUSTOM_RANGE_DAYS = 366

export type PeriodValue = {
  period: Period
  /** `YYYY-MM-DD`, hanya untuk `custom` */
  from: string | null
  /** `YYYY-MM-DD`, hanya untuk `custom` */
  to: string | null
}

export function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}

/** Pesan error untuk rentang kustom, atau `null` bila valid. */
export function validateCustomRange(from: string | null, to: string | null) {
  if (!from || !to) return "Pilih tanggal awal dan akhir."
  if (!isDateString(from) || !isDateString(to)) return "Format tanggal tidak valid."
  const days = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1
  if (days < 1) return "Tanggal awal tidak boleh setelah tanggal akhir."
  if (days > MAX_CUSTOM_RANGE_DAYS) return `Rentang maksimal ${MAX_CUSTOM_RANGE_DAYS} hari.`
  return null
}
