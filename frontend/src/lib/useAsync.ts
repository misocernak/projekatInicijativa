import { useCallback, useEffect, useState, type DependencyList } from 'react'

/** Učitava podatke; vraća i grešku (da stranica ne ostane "Učitavanje…" zauvek) i reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fn()
      .then((d) => {
        if (alive) setData(d)
      })
      .catch((e) => {
        if (alive) setError(e)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, setData, reload }
}
