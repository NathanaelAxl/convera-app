import { TriangleAlertIcon } from "lucide-react"
import { useId, type ComponentType } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { WaProvider } from "@/lib/api/types"
import { WA_PROVIDER_LABELS } from "@/lib/projects"

/** Petunjuk setup per provider; panel berganti langsung saat provider dipilih, tanpa reload (AC 4). */
const GUIDES: Record<WaProvider, ComponentType> = {
  generic: GenericGuide,
}

export function ProviderGuide({ provider }: { provider: WaProvider }) {
  const headingId = useId()
  const Guide = GUIDES[provider]

  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-lg border p-4">
      <h3 id={headingId} className="font-medium">
        Petunjuk setup: {WA_PROVIDER_LABELS[provider]}
      </h3>
      <Guide />
    </section>
  )
}

/** Field payload mode generik yang dikenali (PRD 7.7, FR-27). */
const GENERIC_FIELDS: { names: string[]; description: string }[] = [
  { names: ["message_id"], description: "ID pesan dari provider. Pesan dengan ID yang sama hanya diproses sekali." },
  { names: ["phone", "from"], description: "Nomor WhatsApp customer (lawan bicara)." },
  { names: ["name"], description: "Nama profil WhatsApp customer." },
  {
    names: ["text", "message", "body", "content"],
    description: "Isi pesan. Hanya dibaca untuk mencocokkan keyword dan nilai, tidak disimpan.",
  },
  {
    names: ["direction"],
    description: "inbound (dari customer) atau outbound (dari CS). Opsional; bila tidak ada, dianggap inbound.",
  },
  { names: ["timestamp"], description: "Waktu pesan dalam detik Unix." },
  {
    names: ["referral.ctwa_clid", "referral.source_id", "referral.headline"],
    description: "Data iklan Click-to-WhatsApp: ID klik, ID iklan, dan judul iklan untuk atribusi.",
  },
]

const GENERIC_EXAMPLE = `{
  "message_id": "wamid.HBgNNjI4MTIzNDU2Nzg5MBUCABIYFjNFQjA",
  "phone": "6281234567890",
  "name": "Budi",
  "text": "Halo kak, masih ada promo?",
  "direction": "inbound",
  "timestamp": 1793598000,
  "referral": {
    "ctwa_clid": "ARAkLkA8rmlFeiCktEJQ",
    "source_type": "ad",
    "source_id": "120211234567890",
    "headline": "Promo Akhir Tahun"
  }
}`

/** Mode generik: provider apa pun yang bisa mengirim webhook JSON bertanda tangan HMAC-SHA256. */
function GenericGuide() {
  return (
    <>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Salin Webhook URL di bawah, lalu tempel di pengaturan webhook dashboard provider.</li>
        <li>Aktifkan notifikasi untuk pesan masuk dan pesan keluar, agar pesan dari CS juga terbaca.</li>
        <li>
          Atur provider agar menandatangani setiap request dengan HMAC-SHA256 dari body mentah memakai Webhook Secret,
          lalu mengirimnya di header <code className="font-mono text-xs">X-Signature: sha256=&lt;hex&gt;</code>.
          Request tanpa signature yang valid ditolak.
        </li>
        <li>Simpan pengaturan, kirim pesan uji dari nomor lain, lalu cek Event Log.</li>
      </ol>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Field payload yang dikenali</h4>
        <dl className="divide-y rounded-lg border text-sm">
          {GENERIC_FIELDS.map((field) => (
            <div key={field.names.join()} className="grid gap-1 px-3 py-2 sm:grid-cols-[14rem_1fr] sm:gap-3">
              <dt className="flex flex-wrap gap-x-2 gap-y-1">
                {field.names.map((name) => (
                  <code key={name} className="font-mono text-xs break-all">
                    {name}
                  </code>
                ))}
              </dt>
              <dd className="text-muted-foreground">{field.description}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Peringatan tetap, bukan pemberitahuan baru: `role="note"` agar tidak dibacakan sebagai alert saat halaman dimuat. */}
      <Alert role="note">
        <TriangleAlertIcon aria-hidden="true" className="text-warning" />
        <AlertTitle>Atribusi iklan dan arah pesan bisa tidak lengkap</AlertTitle>
        <AlertDescription>
          Bila provider tidak mengirim <code className="font-mono text-xs">referral</code>, kontak tercatat sebagai
          Organik walaupun datang dari iklan. Bila tidak mengirim <code className="font-mono text-xs">direction</code>,
          semua pesan dianggap dari customer, sehingga slot dengan pengirim CS tidak pernah terpicu.
        </AlertDescription>
      </Alert>

      <details className="group rounded-lg border text-sm">
        <summary className="flex min-h-9 cursor-pointer items-center rounded-lg px-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 touch:min-h-11">
          Contoh payload
        </summary>
        <pre className="overflow-x-auto border-t bg-muted/50 p-3 font-mono text-xs">
          <code>{GENERIC_EXAMPLE}</code>
        </pre>
      </details>
    </>
  )
}
