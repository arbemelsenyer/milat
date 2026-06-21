import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  phone: string;
  email: string;
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
  phone: "",
  email: "",
});

interface Props {
  title: string;
  value: Party;
  onChange: (p: Party) => void;
}

export function PartyForm({ title, value, onChange }: Props) {
  const set = <K extends keyof Party>(k: K, v: Party[K]) => onChange({ ...value, [k]: v });
  const isInd = value.partyType === "individual";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
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
      </div>

      {isInd ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ad" value={value.firstName} onChange={(v) => set("firstName", v)} />
          <Field label="Soyad" value={value.lastName} onChange={(v) => set("lastName", v)} />
          <Field label="TC Kimlik No" value={value.tcKimlik} onChange={(v) => set("tcKimlik", v)} />
          <Field label="Doğum Tarihi" type="date" value={value.birthDate} onChange={(v) => set("birthDate", v)} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Şirket Unvanı" value={value.companyName} onChange={(v) => set("companyName", v)} />
          <Field label="Vergi Dairesi" value={value.taxOffice} onChange={(v) => set("taxOffice", v)} />
          <Field label="Vergi No" value={value.taxNumber} onChange={(v) => set("taxNumber", v)} />
          <Field label="Ticaret Sicil No" value={value.tradeRegistryNo} onChange={(v) => set("tradeRegistryNo", v)} />
          <Field label="Yetkili Kişi Adı Soyadı" value={value.authorizedPerson} onChange={(v) => set("authorizedPerson", v)} className="sm:col-span-2" />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
        <Field label="Adres" value={value.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
        <Field label="Telefon" value={value.phone} onChange={(v) => set("phone", v)} />
        <Field label="E-posta" type="email" value={value.email} onChange={(v) => set("email", v)} />
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
