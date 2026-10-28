import { Link } from 'react-router-dom'
import { BRAND } from '../data/constants'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl text-sage-deep">O projektu</h1>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink/90">
        <p>
          {BRAND.name} je platforma na kojoj građani objavljuju društveno korisne inicijative u svom gradu i
          pozivaju sugrađane da im se pridruže: uređenje parka, čišćenje obale, sadnja drveća, pomoć starijim
          komšijama.
        </p>
        <p>
          Ovo nije platforma za prikupljanje sredstava. Ne primamo novac i ne posredujemo u plaćanju. Cilj je
          samo da se ljudi nađu: da se zna šta se radi, gde, kada i koliko ljudi dolazi.
        </p>
      </div>

      <h2 className="mt-10 text-2xl text-sage-deep">Pravila ponašanja</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/85">
        <li>Inicijative moraju biti u javnom interesu i bezbedne za učesnike.</li>
        <li>Pre radova na javnom prostoru proveri da li je potrebna saglasnost nadležne službe.</li>
        <li>Bez političke propagande, komercijalnih oglasa i govora mržnje.</li>
        <li>Poštuj tuđu privatnost: ne objavljuj tuđe lične podatke.</li>
      </ul>

      <Link to="/nova-inicijativa" className="btn-primary mt-10">
        Pokreni inicijativu
      </Link>
    </div>
  )
}
