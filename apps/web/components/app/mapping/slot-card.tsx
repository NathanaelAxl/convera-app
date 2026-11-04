"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon, Trash2Icon } from "lucide-react"
import { useEffect, useId, useRef } from "react"
import { Controller, useController, useWatch, type UseFormReturn } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MetaEvent } from "@/lib/api/types"
import {
  allowsNoValue,
  isValueEvent,
  META_EVENT_DESCRIPTIONS,
  META_EVENTS,
  SLOT_SENDER_LABELS,
  SLOT_SENDERS,
  slotEventName,
  VALUE_MODE_OPTIONS,
  VALUE_MODES,
} from "@/lib/mapping"
import { cn } from "@/lib/utils"
import type { EventMappingFormValues } from "@/lib/validation/mapping"

import { FormField } from "../form-field"
import { StatusBadge } from "../status-badge"
import { TagInput } from "../tag-input"

/** Elemen di kartu yang bisa menerima fokus setelah slot ditambah, dipindah, atau dihapus (`data-focus`). */
export type SlotFocusTarget = "heading" | "event" | "up" | "down"

type SlotCardProps = {
  form: UseFormReturn<EventMappingFormValues>
  /** Kunci stabil dari `useFieldArray`, dipakai dnd-kit. */
  sortableId: string
  index: number
  count: number
  onMove: (to: number, focus: SlotFocusTarget) => void
  onRemove: () => void
}

const STANDARD_EVENTS = META_EVENTS.filter((event) => event !== "CustomEvent")

/**
 * Satu slot Event Mapping (PRD 8.3 `SlotCard`): nomor urut, badge event, tombol urutan dan hapus, lalu event Meta,
 * nama custom event, keyword trigger, pengirim, dan cara mengambil nilai.
 */
export function SlotCard({ form, sortableId, index, count, onMove, onRemove }: SlotCardProps) {
  const { control } = form
  const position = index + 1
  const headingId = useId()
  const name = `slots.${index}` as const
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    attributes: { roleDescription: "slot yang bisa diurutkan" },
  })
  const slot = useWatch({ control, name })
  // `ref` field `id` dipasang di judul slot: error server untuk slot ini (misalnya slot sudah dihapus di tab lain)
  // memindahkan fokus ke judulnya.
  const {
    field: { ref: attachHeading },
    fieldState: idState,
  } = useController({ control, name: `${name}.id` })
  const metaEvent = slot.meta_event || null
  const eventName = metaEvent
    ? slotEventName({ meta_event: metaEvent, custom_event_name: slot.custom_event_name.trim() || null })
    : null

  // Setelah Simpan pertama, setiap perubahan isi slot memeriksa ulang seluruh slot agar error lintas field
  // (misalnya nama custom event setelah event diganti) ikut hilang atau muncul. Hanya saat isinya berubah,
  // supaya error dari server (misalnya slot sudah dihapus di tab lain) tidak langsung tertimpa.
  const snapshot = JSON.stringify(slot)
  const validatedSnapshot = useRef(snapshot)
  useEffect(() => {
    if (validatedSnapshot.current === snapshot) return
    validatedSnapshot.current = snapshot
    if (form.formState.isSubmitted) void form.trigger(name)
  }, [form, name, snapshot])

  function changeEvent(next: MetaEvent) {
    const mode = form.getValues(`${name}.value_mode`)
    if (!isValueEvent(next) && mode !== "none") form.setValue(`${name}.value_mode`, "none", { shouldDirty: true })
    else if (!allowsNoValue(next) && mode === "none") form.setValue(`${name}.value_mode`, "auto", { shouldDirty: true })
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <section
        aria-labelledby={headingId}
        className={cn(
          "rounded-xl border bg-card text-card-foreground",
          isDragging && "shadow-lg ring-2 ring-ring/50",
          !slot.is_active && "bg-muted/40",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing touch:size-11"
            aria-label={`Seret untuk memindahkan slot ${position}`}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" aria-hidden="true" />
          </button>
          <h3
            id={headingId}
            ref={attachHeading}
            tabIndex={-1}
            data-focus="heading"
            className="font-heading text-sm font-medium outline-none focus-visible:underline"
          >
            Slot {position}
          </h3>
          <Badge variant={eventName ? "secondary" : "outline"} className="max-w-48 truncate">
            {eventName ?? "Event belum dipilih"}
          </Badge>
          <StatusBadge tone={slot.is_active ? "success" : "neutral"}>{slot.is_active ? "Aktif" : "Nonaktif"}</StatusBadge>

          <div className="ml-auto flex items-center gap-1">
            <Controller
              control={control}
              name={`${name}.is_active`}
              render={({ field: { value, onChange, ...field } }) => (
                // Label membungkus Switch: seluruh label jadi target sentuh ≥ 44 px (NFR-16).
                <Label className="mr-1 cursor-pointer px-1 touch:min-h-11">
                  <Switch checked={value} onCheckedChange={onChange} {...field} />
                  Aktif
                </Label>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Naikkan slot ${position}`}
              data-focus="up"
              disabled={index === 0}
              onClick={() => onMove(index - 1, index - 1 === 0 ? "down" : "up")}
            >
              <ArrowUpIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Turunkan slot ${position}`}
              data-focus="down"
              disabled={index === count - 1}
              onClick={() => onMove(index + 1, index + 1 === count - 1 ? "up" : "down")}
            >
              <ArrowDownIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Hapus slot ${position}`}
              onClick={onRemove}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          {idState.error && (
            <p role="alert" className="text-sm text-destructive">
              {idState.error.message}
            </p>
          )}
          <FieldGroup>
            <FormField
              control={control}
              name={`${name}.meta_event`}
              label="Event Meta"
              description={metaEvent ? META_EVENT_DESCRIPTIONS[metaEvent] : "Event yang dikirim ke Meta saat slot terpicu."}
              render={({ value, onChange, onBlur, ref, disabled, name: fieldName, ...props }) => (
                <Select
                  name={fieldName}
                  value={value}
                  onValueChange={(next: MetaEvent) => {
                    onChange(next)
                    changeEvent(next)
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger ref={ref} onBlur={onBlur} className="w-full sm:w-72" data-focus="event" {...props}>
                    <SelectValue placeholder="Pilih event Meta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Event standar</SelectLabel>
                      {STANDARD_EVENTS.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectItem value="CustomEvent">Custom Event</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />

            {metaEvent === "CustomEvent" && (
              <FormField
                control={control}
                name={`${name}.custom_event_name`}
                label="Nama custom event"
                description="Huruf, angka, dan underscore tanpa spasi, maksimal 50 karakter. Contoh: TanyaOngkir."
                render={(props) => <Input autoComplete="off" spellCheck={false} className="sm:w-72" {...props} />}
              />
            )}

            <FormField
              control={control}
              name={`${name}.trigger_keywords`}
              label="Keyword trigger"
              description="Opsional. Kosongkan agar semua pesan memicu slot ini. Huruf besar/kecil tidak dibedakan. Tekan Enter atau koma untuk menambah."
              render={(props) => <TagInput itemName="keyword" placeholder="Ketik keyword lalu Enter" {...props} />}
            />

            <SenderField form={form} index={index} />

            {metaEvent && isValueEvent(metaEvent) && <ValueModeField form={form} index={index} event={metaEvent} />}
          </FieldGroup>
        </div>
      </section>
    </li>
  )
}

/** `ToggleGroup` pengirim: Customer / CS / Keduanya (FR-23). */
function SenderField({ form, index }: { form: UseFormReturn<EventMappingFormValues>; index: number }) {
  const id = useId()
  return (
    <Controller
      control={form.control}
      name={`slots.${index}.sender`}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid || undefined}>
          <FieldLegend id={`${id}-legend`} variant="label">
            Pengirim
          </FieldLegend>
          <ToggleGroup
            ref={field.ref}
            type="single"
            variant="outline"
            spacing={0}
            value={field.value}
            // Grup tunggal Radix mengirim "" saat item aktif diklik lagi; pengirim wajib dipilih, jadi diabaikan.
            onValueChange={(value) => value && field.onChange(value)}
            aria-labelledby={`${id}-legend`}
            aria-describedby={[`${id}-description`, fieldState.error && `${id}-error`].filter(Boolean).join(" ")}
          >
            {SLOT_SENDERS.map((sender) => (
              <ToggleGroupItem
                key={sender}
                value={sender}
                className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90"
              >
                {SLOT_SENDER_LABELS[sender]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription id={`${id}-description`}>
            Customer = pesan masuk dari customer, CS = pesan keluar dari tim Anda.
          </FieldDescription>
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  )
}

/** Cara mengambil nilai, hanya untuk event bernilai (FR-24, AC 3); nominal untuk nilai tetap. */
function ValueModeField({
  form,
  index,
  event,
}: {
  form: UseFormReturn<EventMappingFormValues>
  index: number
  event: MetaEvent
}) {
  const id = useId()
  const valueMode = useWatch({ control: form.control, name: `slots.${index}.value_mode` })
  const modes = VALUE_MODES.filter((mode) => mode !== "none" || allowsNoValue(event))

  return (
    <>
      <Controller
        control={form.control}
        name={`slots.${index}.value_mode`}
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={fieldState.invalid || undefined}>
            <FieldLegend variant="label">Cara mengambil nilai</FieldLegend>
            <RadioGroup
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              className="gap-2"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? `${id}-error` : undefined}
            >
              {modes.map((mode) => (
                <FieldLabel key={mode} htmlFor={`${id}-${mode}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem
                      id={`${id}-${mode}`}
                      value={mode}
                      aria-labelledby={`${id}-${mode}-title`}
                      aria-describedby={`${id}-${mode}-description`}
                    />
                    <FieldContent>
                      <FieldTitle id={`${id}-${mode}-title`}>{VALUE_MODE_OPTIONS[mode].label}</FieldTitle>
                      <FieldDescription id={`${id}-${mode}-description`}>
                        {VALUE_MODE_OPTIONS[mode].description}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            <FieldError id={`${id}-error`} errors={[fieldState.error]} />
          </FieldSet>
        )}
      />
      {valueMode === "fixed" && (
        <FormField
          control={form.control}
          name={`slots.${index}.fixed_value`}
          label="Nominal (Rp)"
          description="Lebih dari 0. Contoh: 150000 atau 150.000."
          render={(props) => (
            <div className="relative sm:w-72">
              <span
                className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
                aria-hidden="true"
              >
                Rp
              </span>
              <Input inputMode="decimal" autoComplete="off" className="pl-9" {...props} />
            </div>
          )}
        />
      )}
    </>
  )
}
