import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/Bits'
import { BRAND } from '../data/constants'
import { LEGAL_UPDATED, OPERATOR } from '../data/legal'

function Legal({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-6 pt-10">
      <PageHead eyebrow={eyebrow} title={title} text={`Poslednja izmena: ${LEGAL_UPDATED}`} />
      <div className="space-y-8 text-[15px] leading-[1.8] text-ink/85 [&_h2]:mb-3 [&_h2]:text-2xl [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  )
}

export function Privacy() {
  return (
    <Legal eyebrow="Privatnost" title="Politika privatnosti">
      <section>
        <h2>1. Ko obrađuje tvoje podatke</h2>
        <p>
          Rukovalac podacima je <strong>{OPERATOR.name}</strong>
          {OPERATOR.address ? `, ${OPERATOR.address}` : ''}
          {OPERATOR.idNumber ? ` (${OPERATOR.idNumber})` : ''}. Pitanja o podacima možeš da pošalješ na{' '}
          <strong>{OPERATOR.email}</strong>.
        </p>
        <p>
          {BRAND.name} je platforma na kojoj ljudi objavljuju akcije u svom gradu, a drugi se prijavljuju da
          učestvuju. Ne prikupljamo novac i ne obrađujemo plaćanja.
        </p>
      </section>

      <section>
        <h2>2. Koje podatke obrađujemo</h2>
        <ul>
          <li>
            <strong>Nalog:</strong> ime, mejl adresa, grad (opciono) i lozinka, koju čuvamo samo u zaštićenom (heširanom) obliku.
          </li>
          <li>
            <strong>Prijava na akciju:</strong> ime i mejl adresa, i podatak na koju si se akciju prijavio/la. Za prijavu
            nije potreban nalog.
          </li>
          <li>
            <strong>Sadržaj koji objaviš:</strong> naslov, opis, mesto, vreme, slika i kontakt, ako ga sam/a upišeš. Ovo je javno vidljivo
            uz tvoje ime kao organizatora.
          </li>
          <li>
            <strong>Prijave sadržaja:</strong> razlog i poruka, i mejl adresa ako je ostaviš.
          </li>
          <li>
            <strong>Tehnički podaci:</strong> IP adresa i podaci o pregledaču u zapisima servera, radi bezbednosti i otklanjanja grešaka.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Zašto i na kom osnovu</h2>
        <ul>
          <li>
            <strong>Vođenje naloga i prijava (izvršenje usluge):</strong> da bi mogao/la da pokrećeš akcije i da se prijavljuješ.
          </li>
          <li>
            <strong>Obaveštenja o akciji (saglasnost):</strong> potvrda prijave, kalendar, podsetnik i obaveštenje o izmeni ili otkazivanju.
            Saglasnost daješ pri prijavi i možeš da je povučeš odjavom ili zahtevom za brisanje.
          </li>
          <li>
            <strong>Bezbednost i moderacija (legitimni interes):</strong> sprečavanje zloupotreba, spama i neprikladnog sadržaja.
          </li>
        </ul>
        <p>Podatke ne prodajemo i ne koristimo za reklame.</p>
      </section>

      <section>
        <h2>4. Ko vidi tvoje podatke</h2>
        <ul>
          <li>Javno su vidljivi sadržaj akcije i ime organizatora.</li>
          <li>
            Organizator vidi <strong>imena</strong> prijavljenih volontera, ali ne i njihove mejl adrese. Obaveštenja volonterima šaljemo mi.
          </li>
          <li>Moderatori platforme mogu da vide prijave sadržaja i podatke potrebne za njihovo rešavanje.</li>
          <li>
            Hosting i slanje mejlova obavljaju provajderi koji podatke obrađuju po našem nalogu i samo za potrebe rada platforme.
          </li>
          <li>
            <strong>Mapa i pretraga adrese:</strong> mapa i pretraga adrese koriste OpenStreetMap (OpenStreetMap Foundation). Kada pri
            pokretanju akcije upišeš adresu da bi se pin postavio na mapu, ta adresa (zajedno sa tvojom IP adresom) šalje se njihovoj
            usluzi pretrage; prikaz mape takođe učitava pločice sa njihovih servera.
          </li>
          <li>
            <strong>Prijava preko Google naloga:</strong> ako izabereš tu prijavu, od Google-a dobijamo samo ime i potvrđenu mejl adresu.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Kolačići</h2>
        <p>
          Koristimo samo neophodne kolačiće: sesiju (da ostaneš prijavljen/a) i zaštitni kolačić protiv falsifikovanih zahteva. Ne
          koristimo kolačiće za analitiku ni za reklame, pa zato nema banera za saglasnost. Ako to ikada uvedemo, tražićemo tvoju saglasnost.
        </p>
      </section>

      <section>
        <h2>6. Koliko dugo čuvamo podatke</h2>
        <ul>
          <li>Nalog i prijave čuvamo dok nalog postoji, a briše se na tvoj zahtev.</li>
          <li>Rezervne kopije baze čuvamo najviše 14 dana, a zapise servera najviše 14 dana.</li>
          <li>Prijave sadržaja čuvamo dok je to potrebno za moderaciju i zaštitu platforme.</li>
        </ul>
      </section>

      <section>
        <h2>7. Tvoja prava</h2>
        <p>
          Imaš pravo da zatražiš uvid u podatke, ispravku, brisanje, ograničenje obrade, prenosivost, da uložiš prigovor i da povučeš
          saglasnost. Piši nam na <strong>{OPERATOR.email}</strong> i odgovorićemo u roku od 30 dana. Imaš pravo i na pritužbu Povereniku za
          informacije od javnog značaja i zaštitu podataka o ličnosti (poverenik.rs).
        </p>
      </section>

      <section>
        <h2>8. Bezbednost</h2>
        <p>
          Veza sa sajtom je šifrovana, lozinke se čuvaju heširane, a pristup administraciji je ograničen. Nijedan sistem nije potpuno
          bezbedan, ali podatke čuvamo pažljivo i koristimo samo ono što nam je potrebno.
        </p>
      </section>

      <section>
        <h2>9. Izmene</h2>
        <p>
          Ako promenimo ovu politiku, objavićemo novu verziju na ovoj strani. Uz uslove korišćenja pročitaj i{' '}
          <Link to="/uslovi" className="font-semibold text-sage-dark underline">
            uslove korišćenja
          </Link>
          .
        </p>
      </section>
    </Legal>
  )
}

export function Terms() {
  return (
    <Legal eyebrow="Pravila" title="Uslovi korišćenja">
      <section>
        <h2>1. Šta je {BRAND.name}</h2>
        <p>
          {BRAND.name} povezuje ljude koji žele da urade nešto korisno za svoj grad. Organizatori objavljuju akcije, a volonteri se
          prijavljuju. Platforma ne organizuje akcije, ne prikuplja novac i ne učestvuje u njima.
        </p>
      </section>

      <section>
        <h2>2. Nalog</h2>
        <ul>
          <li>Za pokretanje akcije potreban je nalog sa potvrđenom mejl adresom. Za prijavu na akciju dovoljni su ime i mejl.</li>
          <li>Podaci koje uneseš moraju biti tačni. Čuvaj svoju lozinku i ne deli je.</li>
          <li>Nalog možeš da obrišeš u svakom trenutku zahtevom na {OPERATOR.email}.</li>
        </ul>
      </section>

      <section>
        <h2>3. Pravila za organizatore</h2>
        <ul>
          <li>Akcija mora biti u javnom interesu, zakonita i bezbedna za učesnike.</li>
          <li>Za radove na javnom ili tuđem prostoru odgovoran/na si da obezbediš saglasnost nadležne službe ili vlasnika.</li>
          <li>Odgovoran/na si za bezbednost i organizaciju okupljanja, kao i za tačnost opisa, mesta i vremena.</li>
          <li>Objavljuj samo sadržaj i slike na koje imaš pravo i ne objavljuj tuđe lične podatke bez saglasnosti.</li>
        </ul>
      </section>

      <section>
        <h2>4. Zabranjeno je</h2>
        <ul>
          <li>političko agitovanje, komercijalno oglašavanje i prikupljanje novca ili donacija;</li>
          <li>govor mržnje, uvrede, pretnje, diskriminacija i nasilan ili nezakonit sadržaj;</li>
          <li>lažne akcije, obmanjivanje volontera i zloupotreba tuđih mejl adresa;</li>
          <li>automatizovano prikupljanje podataka i ometanje rada platforme.</li>
        </ul>
      </section>

      <section>
        <h2>5. Moderacija</h2>
        <p>
          Svako može da prijavi sporan sadržaj. Zadržavamo pravo da akciju sakrijemo ili uklonimo i da ograničimo nalog ako se
          krše ova pravila. Organizatora o tome obaveštavamo mejlom.
        </p>
      </section>

      <section>
        <h2>6. Učešće i odgovornost</h2>
        <p>
          Učešće u akcijama je dobrovoljno i na sopstvenu odgovornost. Platforma ne proverava svaku akciju niti garantuje njenu
          bezbednost ili ishod. Pre dolaska proceni da li ti je akcija bezbedna, a decu vodi samo uz odgovornu odraslu osobu. U meri
          koju dozvoljava zakon, ne odgovaramo za štetu nastalu u vezi sa akcijama koje organizuju korisnici.
        </p>
      </section>

      <section>
        <h2>7. Sadržaj koji objaviš</h2>
        <p>
          Sadržaj ostaje tvoj. Objavljivanjem nam daješ pravo da ga prikazujemo na platformi i u obaveštenjima povezanim sa tvojom akcijom.
          Možeš ga izmeniti ili ukloniti, a otkazivanjem akcije obaveštavaš prijavljene.
        </p>
      </section>

      <section>
        <h2>8. Podaci i izmene uslova</h2>
        <p>
          O obradi podataka pročitaj{' '}
          <Link to="/privatnost" className="font-semibold text-sage-dark underline">
            politiku privatnosti
          </Link>
          . Uslove možemo da menjamo; nova verzija važi kada se objavi na ovoj strani. Primenjuje se pravo Republike Srbije.
        </p>
        <p>
          Operater platforme: <strong>{OPERATOR.name}</strong>
          {OPERATOR.address ? `, ${OPERATOR.address}` : ''}. Kontakt: <strong>{OPERATOR.email}</strong>.
        </p>
      </section>
    </Legal>
  )
}
