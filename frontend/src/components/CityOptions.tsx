import { CITY_GROUPS } from '../data/cities'

/**
 * Opcije za <select> sa gradovima, grupisane kao u Temelju: prvo gradske opštine Beograda, pa ostali gradovi i opštine.
 * Zatvorena lista: korisnik ne upisuje grad slobodnim tekstom, pa se isto mesto ne pojavljuje u više oblika.
 */
export default function CityOptions() {
  return (
    <>
      {CITY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  )
}
