
export const fetcher = async (url: string) => {
  const res = await fetch(url);

  // Jika respons tidak OK, lempar Error dengan detail
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.error || 'Terjadi kesalahan saat fetching data');
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};