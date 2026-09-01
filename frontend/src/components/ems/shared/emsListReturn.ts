export type EmsListReturnState = {
  returnTo?: {
    pathname: string;
    search: string;
  };
  /** @deprecated Prefer returnTo */
  equipmentListSearch?: string;
};

export function emsListReturnState(location: { pathname: string; search: string }): EmsListReturnState {
  return {
    returnTo: {
      pathname: location.pathname,
      search: location.search || '',
    },
  };
}

export function emsBackLocation(state: unknown): { pathname: string; search: string } | null {
  const parsed = (state || {}) as EmsListReturnState;
  if (parsed.returnTo?.pathname) {
    return {
      pathname: parsed.returnTo.pathname,
      search: parsed.returnTo.search || '',
    };
  }
  if (typeof parsed.equipmentListSearch === 'string') {
    const search = parsed.equipmentListSearch;
    return {
      pathname: '/ems/equipment',
      search: !search ? '' : search.startsWith('?') ? search : `?${search}`,
    };
  }
  return null;
}
