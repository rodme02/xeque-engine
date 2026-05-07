type Props = {
  value: string;
  onChange: (id: string) => void;
  options: string[];
  label?: string;
  disabled?: boolean;
};

export default function EngineSelect({
  value,
  onChange,
  options,
  label = "Engine",
  disabled,
}: Props) {
  return (
    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-edge bg-bg-elevated px-2 py-1.5 text-sm font-mono text-ink focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((id) => (
          <option key={id} value={id} className="bg-bg-card">
            {id}
          </option>
        ))}
      </select>
    </label>
  );
}
