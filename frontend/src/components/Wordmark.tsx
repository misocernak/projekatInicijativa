/** Logo: tekst lepšaSrbija.com (bez ikonice). */
export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-[24px] font-extrabold leading-none tracking-tight ${className}`}>
      <span className="text-sage-deep">lepša</span>
      <span className="text-sage-dark">Srbija</span>
      <span className="font-semibold text-sage-deep/45">.com</span>
    </span>
  )
}
