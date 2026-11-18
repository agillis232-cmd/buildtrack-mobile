import type { Router } from "expo-router"

export type GalleryPhoto = {
  id: string
  url: string
  caption?: string | null
  uploadedAt?: string | null
}

type GalleryCallbacks = {
  /** Called after a photo is deleted in the viewer, so the grid can drop it. */
  onDeleted?: (photoId: string) => void
  /** Called after a photo's note is changed in the viewer. */
  onCaptionChanged?: (photoId: string, caption: string) => void
}

type Gallery = { projectId: string; photos: GalleryPhoto[] } & GalleryCallbacks

// The photo list is handed to the viewer here rather than squeezed into the URL.
let current: Gallery | null = null

/** Open the full-screen viewer on one photo, able to swipe through the rest. */
export function openPhotoViewer(
  router: Router,
  projectId: string,
  photos: GalleryPhoto[],
  index: number,
  callbacks: GalleryCallbacks = {},
) {
  const photo = photos[index]
  if (!photo) return
  current = {
    projectId,
    photos: photos.map(p => ({ id: p.id, url: p.url, caption: p.caption ?? null, uploadedAt: p.uploadedAt ?? null })),
    ...callbacks,
  }
  router.push({
    pathname: "/project/[id]/photo-viewer",
    params: { id: projectId, photoId: photo.id, url: photo.url, caption: photo.caption || "" },
  })
}

/** The list the viewer was opened with (null if it was opened some other way). */
export function currentGallery(projectId: string): Gallery | null {
  return current && current.projectId === projectId ? current : null
}
