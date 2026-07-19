import { useEffect, useState } from 'react';

export function useFocusRefresh() {
  const [refreshRevision, setRefreshRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshRevision((current) => current + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('sup7eme:data-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('sup7eme:data-changed', refresh);
    };
  }, []);
  return refreshRevision;
}
