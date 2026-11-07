/** Centre-crop a picked image to a square and shrink it, so the profile photo stays tiny in storage. */
export async function toAvatar(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file, such as a JPG or PNG.')
  if (file.size > 20 * 1024 * 1024) throw new Error('That image is over 20 MB. Choose a smaller one.')
  let bmp: ImageBitmap
  try {
    // Phone photos store their rotation separately (EXIF); apply it so portraits aren't sideways.
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file))
  } catch {
    throw new Error('That image couldn’t be read. Try a JPG or PNG.')
  }
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
  bmp.close()
  return canvas.toDataURL('image/webp', 0.85)
}
