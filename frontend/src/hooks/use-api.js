import { useEffect, useState } from 'react';

export function useApiResource(loader, dependencies = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState((current) => ({ ...current, status: 'loading', error: null }));

    loader({ signal: controller.signal })
      .then((data) => { if (active) setState({ status: 'success', data, error: null }); })
      .catch((error) => { if (active && error.name !== 'AbortError') setState({ status: 'error', data: null, error }); });

    return () => { active = false; controller.abort(); };
  }, dependencies);

  return state;
}

