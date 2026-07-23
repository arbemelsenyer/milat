import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export type Party = {
  partyType: "individual" | "corporate";
  // individual
  firstName: string;
  lastName: string;
  tcKimlik: string;
  birthDate: string;
  // corporate
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  tradeRegistryNo: string;
  authorizedPerson: string;
  // shared
  address: string;
  gsm: string;
  phone: string;
  email: string;
  // vekil (opsiyonel, bireysel/kurumsal fark etmez)
  vekilAdSoyad: string;
  vekilBaro: string;
  vekilSicilNo: string;
};

export const emptyParty = (): Party => ({
  partyType: "individual",
  firstName: "",
  lastName: "",
  tcKimlik: "",
  birthDate: "",
  companyName: "",
  taxOffice: "",
  taxNumber: "",
  tradeRegistryNo: "",
  authorizedPerson: "",
  address: "",
  gsm: "",
  phone: "",
  email: "",
  vekilAdSoyad: "",
  vekilBaro: "",
  vekilSicilNo: "",
});

interface Props {
  index: number;
  value: Party;
  onChange: (p: Party) => void;
  onRemove?: () => void;
}

export function PartyForm({ index, value, onChange, onRemove }: Props) {
  const set = <K extends keyof Party>(k: K, v: Party[K]) => onChange({ ...value, [k]: v });
  const isInd = value.partyType === "individual";
  const [vekilOpen, setVekilOpen] = useState(false);

  return (
    <Card className="p-5 space-y-4 relative">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">Taraf {index + 1}</h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Taraf ${index + 1} sil`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <RadioGroup
        className="flex gap-4"
        value={value.partyType}
        onValueChange={(v) => set("partyType", v as Party["partyType"])}
      >
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <RadioGroupItem value="individual" /> Bireysel
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <RadioGroupItem value="corporate" /> Kurumsal
        </label>
      </RadioGroup>

      {isInd ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ad" value={value.firstName} onChange={(v) => set("firstName", v)} />
          <Field label="Soyad" value={value.lastName} onChange={(v) => set("lastName", v)} />
          <Field label="TC Kimlik No" value={value.tcKimlik} onChange={(v) => set("tcKimlik", v)} />
          <Field label="Doğum Tarihi" type="date" value={value.birthDate} onChange={(v) => set("birthDate", v)} />
          <Field label="Adres" value={value.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
          <Field label="GSM" value={value.gsm} onChange={(v) => set("gsm", v)} />
          <Field label="Telefon" value={value.phone} onChange={(v) => set("phone", v)} />
          <Field label="E-posta" type="email" value={value.email} onChange={(v) => set("email", v)} className="sm:col-span-2" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kurum Adı" value={value.companyName} onChange={(v) => set("companyName", v)} className="sm:col-span-2" />
          <Field label="Vergi Dairesi" value={value.taxOffice} onChange={(v) => set("taxOffice", v)} />
          <Field label="Vergi No" value={value.taxNumber} onChange={(v) => set("taxNumber", v)} />
          <Field label="Ticaret Sicil No" value={value.tradeRegistryNo} onChange={(v) => set("tradeRegistryNo", v)} />
          <Field label="Yetkili Kişi" value={value.authorizedPerson} onChange={(v) => set("authorizedPerson", v)} />
          <Field label="Adres" value={value.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
          <Field label="Telefon" value={value.phone} onChange={(v) => set("phone", v)} />
          <Field label="E-posta" type="email" value={value.email} onChange={(v) => set("email", v)} />
        </div>
      )}

      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setVekilOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          {vekilOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Vekil Bilgisi (opsiyonel)
        </button>
        {vekilOpen && (
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <Field label="Vekil Adı Soyadı" value={value.vekilAdSoyad} onChange={(v) => set("vekilAdSoyad", v)} />
            <Field label="Baro" value={value.vekilBaro} onChange={(v) => set("vekilBaro", v)} />
            <Field label="Sicil No" value={value.vekilSicilNo} onChange={(v) => set("vekilSicilNo", v)} />
          </div>
        )}
      </div>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
