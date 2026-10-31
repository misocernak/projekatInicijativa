/** Smanjuje sliku na najviše maxSide px i vraća WebP (JPEG tamo gde pregledač ne ume WebP). Server svakako ponovo kodira u WebP. */
export function resizeImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
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
        (webp) => {
          if (webp?.type === 'image/webp') return resolve(webp)
          // npr. Safari ne ume da kodira WebP: vrati JPEG
          canvas.toBlob((jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('Slika se ne može obraditi.'))), 'image/jpeg', quality)
        },
        'image/webp',
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
