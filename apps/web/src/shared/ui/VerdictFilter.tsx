export type VerdictFilterValue =
  | ''
  | 'correct'
  | 'overcharged'
  | 'undercharged';

type Props = {
  value: VerdictFilterValue;
  onChange: (value: VerdictFilterValue) => void;
};

export function VerdictFilter({ value, onChange }: Props) {
  return (
    <label className="inline">
      Status
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VerdictFilterValue)}
      >
        <option value="">All statuses</option>
        <option value="overcharged">Overcharged</option>
        <option value="undercharged">Undercharged</option>
        <option value="correct">Correct</option>
      </select>
    </label>
  );
}
