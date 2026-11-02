"use client"

import { createParser, parseAsInteger, parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs"

import type { Period } from "@/lib/api/types"
import { isDateString, PERIODS, type PeriodValue } from "@/lib/period"

// Filter halaman selalu disimpan di query string (PRD 8.1). `history: "push"` agar tombol back browser bekerja.

const parseAsDateString = createParser({
  parse: (value) => (isDateString(value) ? value : null),
  serialize: (value: string) => value,
})

export const pageParser = parseAsInteger.withDefault(1).withOptions({ history: "push" })

/** `?page=` untuk tabel berpaginasi. */
export function usePageParam() {
  return useQueryState("page", pageParser)
}

/** `?period=&from=&to=`; mengganti periode mengembalikan tabel ke halaman 1. */
export function usePeriodFilter(defaultPeriod: Period) {
  const [values, setValues] = useQueryStates(
    {
      period: parseAsStringLiteral(PERIODS).withDefault(defaultPeriod),
      from: parseAsDateString,
      to: parseAsDateString,
      page: parseAsInteger,
    },
    { history: "push" },
  )

  const value: PeriodValue = { period: values.period, from: values.from, to: values.to }

  function setValue(next: PeriodValue) {
    const isCustom = next.period === "custom"
    return setValues({
      period: next.period,
      from: isCustom ? next.from : null,
      to: isCustom ? next.to : null,
      page: null,
    })
  }

  return [value, setValue] as const
}
