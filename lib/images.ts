// Photo grids were loading every photo at full camera resolution.
// Cloudinary can resize on the fly, so grids ask for a small square instead.
export function cloudinaryThumb(url: string | null | undefined, size = 400): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_jpg/`)
}

// Full-screen viewing: the whole photo (no crop), sized for a phone screen
// so it opens quickly instead of downloading the camera original.
export function cloudinaryScreen(url: string | null | undefined, width = 1600): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/c_limit,w_${width},h_${width},q_auto,f_jpg/`)
}

// The original photo as a JPEG, for sharing and saving.
export function cloudinaryOriginal(url: string | null | undefined): string {
  if (!url) return ""
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", "/upload/f_jpg/")
}
