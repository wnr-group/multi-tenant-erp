export interface FeeType {
  id: string;
  name: string;
  category: "core" | "ancillary" | "miscellaneous";
  is_predefined: boolean;
}

interface Props {
  feeTypes: FeeType[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Fees",
  ancillary: "Ancillary & Service Fees",
  miscellaneous: "Miscellaneous Fees",
};

const CATEGORY_ORDER = ["core", "ancillary", "miscellaneous"] as const;

export function FeeTypeSelect({
  feeTypes,
  value,
  onChange,
  required,
  className,
  placeholder = "Select fee type",
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={
        className ??
        "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      }
    >
      <option value="">{placeholder}</option>
      {CATEGORY_ORDER.map((cat) => {
        const predefined = feeTypes.filter((ft) => ft.category === cat && ft.is_predefined);
        const custom = feeTypes.filter((ft) => ft.category === cat && !ft.is_predefined);
        const all = [...predefined, ...custom];
        if (all.length === 0) return null;
        return (
          <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
            {all.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
                {!ft.is_predefined ? " (Custom)" : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
