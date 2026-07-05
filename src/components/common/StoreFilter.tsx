import { stores } from '../../domain/data';

type StoreFilterProps = {
  activeStoreId: string;
  totalCount: number;
  ariaLabel: string;
  getCount: (storeId: string) => number;
  onChange: (storeId: string) => void;
};

export function StoreFilter({
  activeStoreId,
  totalCount,
  ariaLabel,
  getCount,
  onChange,
}: StoreFilterProps) {
  return (
    <div className="employee-filter" aria-label={ariaLabel}>
      <button
        type="button"
        className={activeStoreId === 'all' ? 'is-selected' : undefined}
        onClick={() => onChange('all')}
      >
        전체 {totalCount}
      </button>
      {stores.map((store) => (
        <button
          type="button"
          className={activeStoreId === store.id ? 'is-selected' : undefined}
          key={store.id}
          onClick={() => onChange(store.id)}
        >
          {store.name} {getCount(store.id)}
        </button>
      ))}
    </div>
  );
}
