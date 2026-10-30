/** Smanjuje sliku na najviše maxSide px i vraća JPEG (brži upload; server svakako ponovo kodira). */
export function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * k)
      canvas.height = Math.round(img.height * k)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Slika se ne može obraditi.'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Slika se ne može učitati.'))
    }
    img.src = url
  })
}
