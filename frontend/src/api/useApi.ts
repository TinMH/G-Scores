import { useCallback, useEffect, useState } from 'react';
import { t } from '../i18n';
import { ApiError } from './client';

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/** Fetch once (and again on reload()); aborts the request on unmount. */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const error = err instanceof ApiError ? err : new ApiError(500, t('Đã xảy ra lỗi không xác định.'));
        setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
    // `fetcher` is a stable api.* method; re-run only on reload().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
