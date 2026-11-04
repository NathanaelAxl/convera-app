"use client"

import type { Control } from "react-hook-form"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BUSINESS_CATEGORY_LABELS } from "@/lib/projects"
import { BUSINESS_CATEGORIES } from "@/lib/settings"
import type { ProjectSettingsFormValues } from "@/lib/validation/settings"

import { FormField } from "../form-field"

/** Nama dan kategori bisnis proyek (FR-10, FR-19). */
export function ProjectInfoCard({ control }: { control: Control<ProjectSettingsFormValues> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Info proyek</h2>
        </CardTitle>
        <CardDescription>Slug dan Webhook URL tidak berubah walaupun nama proyek diganti.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FormField
            control={control}
            name="name"
            label="Nama proyek"
            render={(props) => <Input autoComplete="off" {...props} />}
          />
          <FormField
            control={control}
            name="business_category"
            label="Kategori bisnis"
            description="Pilih yang paling mendekati bisnis Anda. Kategori menentukan keyword default untuk penilaian lead otomatis."
            render={({ value, onChange, onBlur, ref, disabled, name, ...props }) => (
              <Select name={name} value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger ref={ref} onBlur={onBlur} className="w-full sm:w-72" {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {BUSINESS_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
