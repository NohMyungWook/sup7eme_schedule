import { stores as fallbackStores } from '../../domain/data';
import type { Store } from '../../domain/types';
import { Dropdown } from './Dropdown';

type StoreSelectProps = {
  stores?: Store[];
  value: string;
  onChange: (storeId: string) => void;
  ariaLabel?: string;
};

export function StoreSelect({ stores = fallbackStores, value, onChange, ariaLabel }: StoreSelectProps) {
  return (
    <Dropdown
      value={value}
      options={stores.map((store) => ({ value: store.id, label: store.name }))}
      ariaLabel={ariaLabel}
      onChange={onChange}
    />
  );
}
