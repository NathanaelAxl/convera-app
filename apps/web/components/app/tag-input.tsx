"use client"

import { XIcon } from "lucide-react"
import { useRef, useState, type ComponentProps, type KeyboardEvent, type Ref } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TagInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> & {
  value: string[]
  onChange: (value: string[]) => void
  ref?: Ref<HTMLInputElement>
  /** Nama satu item untuk label tombol hapus dan pengumuman, misalnya "keyword". */
  itemName?: string
}

const SEPARATOR = /[,\n]/

const sameText = (a: string, b: string) => a.toLocaleLowerCase("id-ID") === b.toLocaleLowerCase("id-ID")

/**
 * Input daftar teks pendek (PRD 8.3, `TagInput` keyword trigger). Enter atau koma menambah item, teks yang
 * ditempel dipisah per koma/baris, dan teks yang masih diketik ikut ditambahkan saat input kehilangan fokus.
 * Item yang sama (tanpa membedakan huruf besar/kecil) tidak ditambahkan dua kali. Setiap perubahan diumumkan
 * lewat `aria-live`, dan setiap item punya tombol hapus berlabel.
 */
export function TagInput({
  value,
  onChange,
  onBlur,
  ref,
  itemName = "item",
  className,
  disabled,
  ...props
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [announcement, setAnnouncement] = useState("")
  /** Item yang tidak ditambahkan karena sudah ada; tampil sampai user mengetik lagi. */
  const [duplicate, setDuplicate] = useState("")

  function add(parts: string[]) {
    const next = [...value]
    const added: string[] = []
    const duplicates: string[] = []
    for (const part of parts.map((item) => item.trim()).filter(Boolean)) {
      if (next.some((item) => sameText(item, part))) duplicates.push(part)
      else {
        next.push(part)
        added.push(part)
      }
    }
    if (added.length > 0) onChange(next)
    setDuplicate(duplicates[0] ?? "")
    const messages = [
      added.length === 1 && `${capitalize(itemName)} "${added[0]}" ditambahkan.`,
      added.length > 1 && `${added.length} ${itemName} ditambahkan.`,
      duplicates.length > 0 && `${capitalize(itemName)} "${duplicates[0]}" sudah ada.`,
    ]
    setAnnouncement(messages.filter(Boolean).join(" "))
  }

  function remove(index: number) {
    const removed = value[index]
    onChange(value.filter((_, itemIndex) => itemIndex !== index))
    setAnnouncement(`${capitalize(itemName)} "${removed}" dihapus.`)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return
    if (event.nativeEvent.isComposing) return
    // Enter pada input kosong tetap menyimpan form seperti field lain.
    if (event.key === "Enter" && text.trim() === "") return
    event.preventDefault()
    add([text])
    setText("")
  }

  function handleChange(next: string) {
    setDuplicate("")
    if (!SEPARATOR.test(next)) return setText(next)
    const parts = next.split(SEPARATOR)
    const rest = parts.pop() ?? ""
    add(parts)
    setText(rest)
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-1.5 py-1 transition-colors touch:py-0 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-3 has-[input[aria-invalid=true]]:ring-destructive/20 has-[input:disabled]:opacity-50 touch:min-h-11 dark:bg-input/30",
          className,
        )}
        onPointerDown={(event) => {
          // Klik di area kosong kontainer memindahkan fokus ke input.
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {value.length > 0 && (
          <ul className="contents" aria-label={`Daftar ${itemName}`}>
            {value.map((item, index) => (
              <li
                key={item}
                className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-secondary py-0.5 pl-2 text-sm text-secondary-foreground"
              >
                <span className="truncate">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Hapus ${itemName} "${item}"`}
                  disabled={disabled}
                  onClick={() => remove(index)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={(element) => {
            inputRef.current = element
            if (typeof ref === "function") ref(element)
            else if (ref) ref.current = element
          }}
          type="text"
          autoComplete="off"
          enterKeyHint="enter"
          className="h-6 min-w-36 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed touch:h-11 md:text-sm"
          value={text}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            if (text.trim() !== "") {
              add([text])
              setText("")
            }
            onBlur?.(event)
          }}
          {...props}
        />
      </div>
      {duplicate && (
        <p className="text-xs text-muted-foreground" aria-hidden="true">
          {`${capitalize(itemName)} "${duplicate}" sudah ada.`}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("id-ID") + text.slice(1)
}
