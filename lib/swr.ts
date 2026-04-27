export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`) as Error & { status: number; info?: unknown };
    err.status = res.status;
    try {
      err.info = await res.json();
    } catch {
      // ignore
    }
    throw err;
  }
  return (await res.json()) as T;
}

export const SWR_CONFIG = {
  refreshInterval: 60_000,
  revalidateOnFocus: false,
};
