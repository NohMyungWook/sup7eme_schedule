import { stores } from '../../domain/data';

type StoreSelectProps = {
  value: string;
  onChange: (storeId: string) => void;
  ariaLabel?: string;
};

export function StoreSelect({ value, onChange, ariaLabel }: StoreSelectProps) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );
}
