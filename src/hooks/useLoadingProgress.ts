import { useState, useEffect } from 'react';

// Simple global state without external dependencies
let globalLoading = false;
let listeners: Set<(loading: boolean) => void> = new Set();

export function setGlobalLoading(loading: boolean) {
  globalLoading = loading;
  listeners.forEach(listener => listener(loading));
}

export function subscribeToLoading(listener: (loading: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGlobalLoading() {
  return globalLoading;
}

export function useGlobalLoading() {
  const [isLoading, setIsLoading] = useState(globalLoading);

  useEffect(() => {
    const unsubscribe = subscribeToLoading(setIsLoading);
    return unsubscribe;
  }, []);

  return { isLoading, setLoading: setGlobalLoading };
}
