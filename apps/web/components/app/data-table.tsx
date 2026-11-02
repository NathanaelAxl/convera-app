"use client"

import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type CellData,
  type Column,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type SortingState,
  type TableFeatures,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PaginationMeta } from "@/lib/api/types"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

// Parameter tipe wajib sama dengan deklarasi aslinya agar augmentasi bisa digabung.
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "@tanstack/table-core" {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /** Label kolom di mode kartu (layar < 768 px) bila `header` bukan teks. */
    label?: string
    /** Kelas tambahan untuk `<th>` dan `<td>`, misalnya `text-right`. */
    className?: string
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/** Sorting dilakukan di server; paginasi memakai `meta` dari API (PRD 7.1). */
export const dataTableFeatures = tableFeatures({ rowSortingFeature })

type Features = typeof dataTableFeatures

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- kolom berbeda tipe nilainya
export type DataTableColumn<TData extends RowData> = ColumnDef<Features, TData, any>

/** Helper kolom yang terikat ke fitur DataTable: `const col = createDataTableColumnHelper<Event>()`. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<Features, TData>()
}

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[]
  data: TData[] | undefined
  getRowId?: (row: TData) => string
  isLoading?: boolean
  /** Ditampilkan sebagai ganti tabel saat data kosong. */
  emptyState?: ReactNode
  /** Keterangan tabel untuk screen reader. */
  caption?: string
  /** Sorting terkontrol (simpan di query string); kolom hanya bisa diurutkan bila ini diisi. */
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  /** Paginasi server; `page` disimpan di query string oleh pemanggil. */
  pagination?: { meta: PaginationMeta; onPageChange: (page: number) => void }
  /** Di bawah 768 px: scroll horizontal di dalam kontainer, atau tampil sebagai kartu (NFR-16). */
  mobile?: "scroll" | "cards"
}

const EMPTY_ROWS: never[] = []
const LOADING_ROWS = 5

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyState,
  caption,
  sorting,
  onSortingChange,
  pagination,
  mobile = "scroll",
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: data ?? EMPTY_ROWS,
    getRowId,
    state: sorting ? { sorting } : undefined,
    onSortingChange,
    enableSorting: Boolean(onSortingChange),
    manualSorting: true,
    enableMultiSort: false,
  })

  const rows = table.getRowModel().rows
  const showSkeleton = isLoading && rows.length === 0

  if (!isLoading && rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className="space-y-3" aria-busy={isLoading || undefined}>
      <div className={cn("overflow-x-auto rounded-xl ring-1 ring-foreground/10", mobile === "cards" && "hidden md:block")}>
        <Table>
          {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={ariaSort(header.column)}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2.5"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon direction={header.column.getIsSorted()} />
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showSkeleton
              ? Array.from({ length: LOADING_ROWS }, (_, index) => (
                  <TableRow key={index}>
                    {columns.map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {mobile === "cards" && (
        <ul className="space-y-3 md:hidden" aria-label={caption}>
          {showSkeleton
            ? Array.from({ length: LOADING_ROWS }, (_, index) => (
                <li key={index}>
                  <Skeleton className="h-24 w-full rounded-xl" />
                </li>
              ))
            : rows.map((row) => (
                <li key={row.id}>
                  <Card size="sm">
                    <CardContent>
                      <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-2">
                        {row.getAllCells().map((cell) => (
                          <div key={cell.id} className="contents">
                            <dt className="text-muted-foreground">{columnLabel(cell.column)}</dt>
                            <dd className="min-w-0 break-words">
                              <table.FlexRender cell={cell} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
        </ul>
      )}

      {pagination && <DataTablePagination {...pagination} />}
    </div>
  )
}

function columnLabel<TData extends RowData>(column: Column<Features, TData>) {
  const { meta, header } = column.columnDef
  return meta?.label ?? (typeof header === "string" ? header : column.id)
}

function ariaSort<TData extends RowData>(column: Column<Features, TData>) {
  if (!column.getCanSort()) return undefined
  const direction = column.getIsSorted()
  return direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  const Icon = direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ArrowUpDownIcon
  return <Icon className={cn(!direction && "text-muted-foreground")} aria-hidden="true" />
}

function DataTablePagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  const { page, per_page, total, total_pages } = meta
  const first = total === 0 ? 0 : (page - 1) * per_page + 1
  const last = Math.min(page * per_page, total)

  return (
    <nav
      className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginasi"
    >
      <p>
        Menampilkan {formatNumber(first)}–{formatNumber(last)} dari {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        <span aria-live="polite">
          Halaman {formatNumber(page)} dari {formatNumber(Math.max(total_pages, 1))}
        </span>
        <Button variant="outline" size="icon" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman berikutnya"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
