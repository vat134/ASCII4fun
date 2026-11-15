import { Button } from "../ui/base/button";

export function CompactChoices({
  label,
  value,
  items,
  onChange
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm">{label}</p>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {items.map((item) => (
          <Button
            key={item.value}
            aria-pressed={value === item.value}
            variant={value === item.value ? "outline" : "ghost"}
            className="h-auto min-h-10 min-w-0 whitespace-normal px-2 text-xs"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
