
export const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));

    const error = new Error(errorData.message || errorData.error || `Error ${res.status}: Gagal fetching data`);
    (error as any).status = res.status;

    if (res.status === 401) {
      (error as any).isAuthError = true;
    }

    throw error;
  }

  return res.json();
};