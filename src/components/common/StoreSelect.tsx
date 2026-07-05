import { stores } from '../../domain/data';
import { Dropdown } from './Dropdown';

type StoreSelectProps = {
  value: string;
  onChange: (storeId: string) => void;
  ariaLabel?: string;
};

export function StoreSelect({ value, onChange, ariaLabel }: StoreSelectProps) {
  return (
    <Dropdown
      value={value}
      options={stores.map((store) => ({ value: store.id, label: store.name }))}
      ariaLabel={ariaLabel}
      onChange={onChange}
    />
  );
}
