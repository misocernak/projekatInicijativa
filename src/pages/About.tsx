import { Link } from 'react-router-dom'
import { PageHead } from '../components/Bits'
import { BRAND } from '../data/constants'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-6 pt-10">
      <PageHead
        eyebrow="O projektu"
        title={
          <>
            Ljudi koji menjaju svoj <em>kraj.</em>
          </>
        }
      />
      <div className="space-y-6 text-[17px] leading-[1.85] text-ink/85">
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

      <section className="card mt-12 p-8 sm:p-10">
        <h2 className="text-4xl text-sage-deep">Pravila ponašanja</h2>
        <ul className="mt-5 space-y-3 text-ink/80">
          {[
            'Inicijative moraju biti u javnom interesu i bezbedne za učesnike.',
            'Pre radova na javnom prostoru proveri da li je potrebna saglasnost nadležne službe.',
            'Bez političke propagande, komercijalnih oglasa i govora mržnje.',
            'Poštuj tuđu privatnost: ne objavljuj tuđe lične podatke.',
          ].map((r) => (
            <li key={r} className="flex gap-3">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <Link to="/nova-inicijativa" className="btn-primary mt-12">
        Pokreni inicijativu
      </Link>
    </div>
  )
}
