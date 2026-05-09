// Point this at your live Vercel URL
export const API_URL = "https://your-vercel-url.vercel.app"

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  })
  return res
}