"use client"

import { useId, type ReactNode } from "react"
import { Controller, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

/** Props yang diteruskan ke input: nilai react-hook-form + id dan atribut aksesibilitas. */
export type FormControlProps<T extends FieldValues, N extends FieldPath<T>> = ControllerRenderProps<T, N> & {
  id: string
  "aria-invalid": boolean
  "aria-describedby"?: string
}

type FormFieldProps<T extends FieldValues, N extends FieldPath<T>> = {
  control: Control<T>
  name: N
  label: ReactNode
  description?: ReactNode
  /** Id elemen lain yang ikut menjelaskan field, misalnya indikator syarat password. */
  describedBy?: string
  render: (props: FormControlProps<T, N>) => ReactNode
}

/**
 * Field form react-hook-form + shadcn `Field`. Label, deskripsi, dan pesan error (dari zod maupun
 * `error.details` server) ditautkan ke input lewat `aria-describedby` (NFR-17).
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  describedBy,
  render,
}: FormFieldProps<T, N>) {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {render({
            ...field,
            id,
            "aria-invalid": fieldState.invalid,
            "aria-describedby":
              [description && descriptionId, describedBy, fieldState.error && errorId].filter(Boolean).join(" ") ||
              undefined,
          })}
          {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
          <FieldError id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
