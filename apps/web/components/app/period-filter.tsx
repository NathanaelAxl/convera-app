"use client"

import { format, parseISO } from "date-fns"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"
import { useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import { id as dayPickerId } from "react-day-picker/locale/id"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDate } from "@/lib/format"
import {
  PERIOD_CHIP_LABELS,
  PERIOD_LABELS,
  validateCustomRange,
  type PeriodPreset,
  type PeriodValue,
} from "@/lib/period"
import { cn } from "@/lib/utils"

type PeriodFilterProps = {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
  /** Preset yang ditampilkan; setiap halaman memakai sebagian preset (PRD 7.1). */
  presets: readonly PeriodPreset[]
  /** Tampilkan pilihan rentang tanggal kustom. */
  allowCustom?: boolean
  variant?: "dropdown" | "chips"
  className?: string
}

/** Filter periode. Pasangkan dengan `usePeriodFilter()` agar nilainya tersimpan di query string. */
export function PeriodFilter({
  value,
  onChange,
  presets,
  allowCustom = true,
  variant = "dropdown",
  className,
}: PeriodFilterProps) {
  const [rangeOpen, setRangeOpen] = useState(false)
  const openRangeAfterMenu = useRef(false)

  const isCustom = value.period === "custom"
  const customLabel = isCustom && value.from && value.to ? `${formatDate(value.from)} – ${formatDate(value.to)}` : null

  const selectPreset = (period: PeriodPreset) => onChange({ period, from: null, to: null })
  const applyRange = (from: string, to: string) => {
    onChange({ period: "custom", from, to })
    setRangeOpen(false)
  }

  const rangeContent = (
    <PopoverContent align="end" className="w-auto p-0">
      <CustomRangeForm
        initialFrom={value.from}
        initialTo={value.to}
        onApply={applyRange}
        onCancel={() => setRangeOpen(false)}
      />
    </PopoverContent>
  )

  if (variant === "chips") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap"
          aria-label="Periode"
          value={isCustom ? "" : value.period}
          onValueChange={(next) => next && selectPreset(next as PeriodPreset)}
        >
          {presets.map((period) => (
            <ToggleGroupItem key={period} value={period}>
              {PERIOD_CHIP_LABELS[period]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {allowCustom && (
          <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
            <PopoverTrigger asChild>
              <Button variant={isCustom ? "secondary" : "outline"} size="sm" aria-pressed={isCustom}>
                <CalendarIcon aria-hidden="true" />
                {customLabel ?? PERIOD_CHIP_LABELS.custom}
              </Button>
            </PopoverTrigger>
            {rangeContent}
          </Popover>
        )}
      </div>
    )
  }

  return (
    <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
      <DropdownMenu>
        <PopoverAnchor asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("justify-between", className)}>
              <CalendarIcon aria-hidden="true" />
              <span className="sr-only">Periode: </span>
              {customLabel ?? PERIOD_LABELS[value.period]}
              <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </PopoverAnchor>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            // Buka popover rentang setelah menu tertutup, tanpa mengembalikan fokus ke tombol.
            if (!openRangeAfterMenu.current) return
            event.preventDefault()
            openRangeAfterMenu.current = false
            setRangeOpen(true)
          }}
        >
          <DropdownMenuRadioGroup
            value={value.period}
            onValueChange={(next) => {
              if (next === "custom") openRangeAfterMenu.current = true
              else selectPreset(next as PeriodPreset)
            }}
          >
            {presets.map((period) => (
              <DropdownMenuRadioItem key={period} value={period}>
                {PERIOD_LABELS[period]}
              </DropdownMenuRadioItem>
            ))}
            {allowCustom && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="custom">{PERIOD_LABELS.custom}…</DropdownMenuRadioItem>
              </>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {rangeContent}
    </Popover>
  )
}

function toDate(value: string | null) {
  return value ? parseISO(value) : undefined
}

function CustomRangeForm({
  initialFrom,
  initialTo,
  onApply,
  onCancel,
}: {
  initialFrom: string | null
  initialTo: string | null
  onApply: (from: string, to: string) => void
  onCancel: () => void
}) {
  const [range, setRange] = useState<DateRange | undefined>(() =>
    initialFrom && initialTo ? { from: toDate(initialFrom), to: toDate(initialTo) } : undefined,
  )
  const [today] = useState(() => new Date())

  const from = range?.from ? format(range.from, "yyyy-MM-dd") : null
  const to = range?.to ? format(range.to, "yyyy-MM-dd") : null
  const error = validateCustomRange(from, to)

  return (
    <div className="flex flex-col gap-3 p-3">
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        locale={dayPickerId}
        weekStartsOn={1}
        captionLayout="dropdown"
        defaultMonth={range?.from ?? today}
        disabled={{ after: today }}
        endMonth={today}
      />
      <p
        className={cn("max-w-64 text-sm", from && to && error ? "text-destructive" : "text-muted-foreground")}
        aria-live="polite"
      >
        {from && to && !error ? `${formatDate(from)} – ${formatDate(to)}` : error}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button size="sm" disabled={!!error} onClick={() => from && to && onApply(from, to)}>
          Terapkan
        </Button>
      </div>
    </div>
  )
}
