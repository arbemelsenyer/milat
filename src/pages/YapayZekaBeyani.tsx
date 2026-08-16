/* YAPAY ZEKÂ NE YAPAR / NE YAPMAZ — bilgi ekranı (İBA şeffaflık şartı).
   Salt bilgi sayfasıdır: veri okumaz, veri yazmaz, model çağrısı yapmaz.
   Metin kurucu tarafından yazılmıştır; madde eklenmez, çıkarılmaz, süslenmez. */

import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

const YAPAR = [
  "Belgelerdeki bilgileri düzenler, özetler ve tarihe göre sıralar.",
  "Uyuşmazlıkla ilgili tarihleri ve olayları belgelerden çıkarır; her bilginin hangi belgeden geldiğini künyesiyle gösterir.",
  "Tarafların beyanları arasındaki farklılıkları ve zaman içindeki değişimleri, alıntıyla dayanaklandırarak arabulucuya bildirir.",
  "Görüşmeye hazırlık için soru önerileri ve seçenek önerileri üretir.",
  "Tutanak ve belge taslakları hazırlar; son hâlini arabulucu verir.",
  "Süreçteki adımları ve süreleri takip eder, hatırlatır.",
];

const YAPMAZ = [
  "Karar vermez. “Kabul et” ya da “kabul etme” demez.",
  "Hukuki tavsiye vermez, sonucu öngörmez, hüküm kurmaz.",
  "Kişilik, psikoloji, duygu durumu veya niyet değerlendirmesi yapmaz; kimseye etiket koymaz.",
  "Dayanağı olmayan hiçbir bulguyu ekranda göstermez; her bulgunun kaynağı bellidir.",
  "Bir tarafın verisini karşı tarafa göstermez.",
  "Verilerinizi model eğitimine, ortak bir havuza veya süreç dışına aktarmaz.",
  "Arabulucunun yerine taraflarla iletişim kurup süreci yönetmez; gönderilen her şey arabulucunun bilgisi ve sorumluluğundadır.",
];

export default function YapayZekaBeyani() {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-3xl py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-semibold mb-3">
            Bu platformda yapay zekâ ne yapar, ne yapmaz
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MediPact'te yapay zekâ, arabulucunun işini kolaylaştıran bir yardımcıdır. Karar vermez,
            taraf tutmaz, sürecin sahibi değildir. Süreci yürüten ve karar veren insandır: arabulucu
            ve taraflar.
          </p>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold">YAPAR</h2>
          <ul className="space-y-2">
            {YAPAR.map((madde, i) => (
              <li key={`yapar-${i}`} className="flex items-start gap-2 text-sm leading-relaxed">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>{madde}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold">YAPMAZ</h2>
          <ul className="space-y-2">
            {YAPMAZ.map((madde, i) => (
              <li key={`yapmaz-${i}`} className="flex items-start gap-2 text-sm leading-relaxed">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <span>{madde}</span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-sm leading-relaxed">
          Sürece dair her karar insana aittir. Yapay zekânın ürettiği hiçbir çıktı, arabulucunun
          değerlendirmesi olmadan işleme konmaz.
        </p>
      </main>
    </div>
  );
}
