"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ListPlusIcon, PlusIcon } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { useFieldArray, useFormState, type UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MAX_SLOTS, slotEventName } from "@/lib/mapping"
import { cn } from "@/lib/utils"
import { newSlotFormValues, type EventMappingFormValues } from "@/lib/validation/mapping"

import { EmptyState } from "../empty-state"
import { SlotCard, type SlotFocusTarget } from "./slot-card"

type PendingFocus = { index: number; target: SlotFocusTarget } | { target: "add" }

/**
 * Kartu Event Mapping di Pengaturan (PRD 8.3 `EventMappingCard`, FR-20–FR-24). Slot bisa ditambah, dihapus, dan
 * diurutkan dengan drag-and-drop atau tombol naik/turun (AC 1); semua perubahan baru permanen setelah Simpan.
 */
export function EventMappingCard({ form }: { form: UseFormReturn<EventMappingFormValues> }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "slots", keyName: "key" })
  const dndId = useId()
  const limitId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<PendingFocus | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  // `useFormState`, bukan `form.formState`: error baru hanya me-render ulang kartu ini, bukan seluruh halaman Pengaturan.
  const slotsError = useFormState({ control: form.control, name: "slots", exact: true }).errors.slots
  const listError = slotsError?.root?.message ?? slotsError?.message
  const full = fields.length >= MAX_SLOTS

  /** Atribut `name` field slot yang terakhir difokus; `null` bila fokus terakhir di luar daftar slot. */
  const lastFocusedField = useRef<string | null>(null)
  useEffect(() => {
    function track(event: FocusEvent) {
      const target = event.target instanceof Element ? event.target : null
      lastFocusedField.current = target && listRef.current?.contains(target) ? target.getAttribute("name") : null
    }
    document.addEventListener("focusin", track)
    return () => document.removeEventListener("focusin", track)
  }, [])

  // Fokus dipindah setelah daftar dirender ulang, supaya tidak jatuh ke `<body>` (NFR-17).
  useLayoutEffect(() => {
    const pending = pendingFocus.current
    if (!pending) {
      // Setelah Simpan, `reset()` membuat ulang kunci slot sehingga kartunya dipasang ulang. Bila Simpan dipicu Enter
      // di field slot, fokus dikembalikan ke field yang sama.
      const name = lastFocusedField.current
      if (name && document.activeElement === document.body) {
        listRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.focus()
      }
      return
    }
    pendingFocus.current = null
    if (pending.target === "add") return addButtonRef.current?.focus()
    const item = listRef.current?.children[pending.index]
    item?.querySelector<HTMLElement>(`[data-focus="${pending.target}"]`)?.focus()
  }, [fields])

  /** "Slot 2 (Lead)" untuk pengumuman screen reader. */
  function slotLabel(index: number) {
    const slot = form.getValues(`slots.${index}`)
    if (!slot?.meta_event) return `Slot ${index + 1}`
    const name = slotEventName({ meta_event: slot.meta_event, custom_event_name: slot.custom_event_name.trim() || null })
    return `Slot ${index + 1} (${name})`
  }

  function indexOf(id: UniqueIdentifier) {
    return fields.findIndex((field) => field.key === id)
  }

  function addSlot() {
    if (full) return
    append(newSlotFormValues(), { shouldFocus: false })
    pendingFocus.current = { index: fields.length, target: "event" }
    setAnnouncement(`Slot ${fields.length + 1} ditambahkan. Pilih event Meta.`)
  }

  function moveSlot(from: number, to: number, focus: SlotFocusTarget) {
    const label = slotLabel(from)
    move(from, to)
    pendingFocus.current = { index: to, target: focus }
    setAnnouncement(`${label} dipindah ke posisi ${to + 1} dari ${fields.length}.`)
  }

  function removeSlot(index: number) {
    const label = slotLabel(index)
    remove(index)
    const remaining = fields.length - 1
    pendingFocus.current = remaining === 0 ? { target: "add" } : { index: Math.min(index, remaining - 1), target: "heading" }
    setAnnouncement(`${label} dihapus. Perubahan permanen setelah disimpan.`)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    move(indexOf(active.id), indexOf(over.id))
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${slotLabel(indexOf(active.id))} diangkat. Pakai panah atas atau bawah untuk memindahkan.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${slotLabel(indexOf(active.id))} berada di posisi ${indexOf(over.id) + 1} dari ${fields.length}.`
        : `${slotLabel(indexOf(active.id))} berada di luar daftar.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${slotLabel(indexOf(active.id))} diletakkan di posisi ${indexOf(over.id) + 1} dari ${fields.length}.`
        : `${slotLabel(indexOf(active.id))} diletakkan kembali.`,
    onDragCancel: ({ active }) => `Batal memindahkan. ${slotLabel(indexOf(active.id))} kembali ke posisinya.`,
  }

  const addButton = (
    <Button
      ref={addButtonRef}
      type="button"
      variant="outline"
      className={cn(full && "cursor-not-allowed opacity-50")}
      // `aria-disabled`: tombol tetap bisa difokus dan keterangan batasnya tetap terbaca.
      aria-disabled={full || undefined}
      aria-describedby={full ? limitId : undefined}
      onClick={addSlot}
    >
      <PlusIcon aria-hidden="true" />
      Tambah slot
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Event Mapping</h2>
        </CardTitle>
        <CardDescription>
          Setiap slot menentukan event Meta yang dikirim saat pesan cocok. Urutan slot adalah urutan funnel, misalnya
          Contact → Lead → InitiateCheckout → Purchase; pesan dicek ke slot aktif dari atas ke bawah.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {listError && (
          <p role="alert" className="text-sm text-destructive">
            {listError}
          </p>
        )}
        {fields.length === 0 ? (
          <EmptyState
            icon={ListPlusIcon}
            title="Belum ada slot"
            description="Tanpa slot aktif, pesan WhatsApp tidak dikirim sebagai event ke Meta. Tambah slot, pilih event, lalu simpan."
            action={addButton}
          />
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable:
                  "Tekan spasi atau Enter untuk mengangkat slot, panah atas atau bawah untuk memindahkan, spasi atau Enter untuk meletakkan, atau Escape untuk batal. Tombol Naikkan dan Turunkan juga bisa dipakai.",
              },
            }}
          >
            <SortableContext items={fields.map((field) => field.key)} strategy={verticalListSortingStrategy}>
              <ol ref={listRef} className="space-y-3" aria-label="Slot event, urut sesuai funnel">
                {fields.map((field, index) => (
                  <SlotCard
                    key={field.key}
                    form={form}
                    sortableId={field.key}
                    index={index}
                    count={fields.length}
                    onMove={(to, focus) => moveSlot(index, to, focus)}
                    onRemove={() => removeSlot(index)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </CardContent>
      {fields.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {addButton}
          <p id={limitId} className="text-sm text-muted-foreground">
            {fields.length} dari {MAX_SLOTS} slot{full && ". Hapus slot lain untuk menambah slot baru"}.
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
