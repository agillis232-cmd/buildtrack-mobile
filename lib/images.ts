// Photo grids were loading every photo at full camera resolution.
// Cloudinary can resize on the fly, so grids ask for a small square instead.
export function cloudinaryThumb(url: string | null | undefined, size = 400): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_jpg/`)
}
