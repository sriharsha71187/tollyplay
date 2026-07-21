/**
 * Media (posters / actor photos) is gated by a build-time kill-switch.
 * Family builds: media on (default). Public/store builds: set VITE_MEDIA=off
 * and no image is ever fetched or rendered — all call sites no-op.
 */
export const mediaEnabled =
  ((import.meta.env?.VITE_MEDIA as string | undefined) ?? 'on') !== 'off'

let peopleMap: Record<string, string> | null = null

async function loadPeople(): Promise<Record<string, string>> {
  if (peopleMap) return peopleMap
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'people.json')
    peopleMap = (await res.json()) as Record<string, string>
  } catch {
    peopleMap = {}
  }
  return peopleMap
}

const CACHE_KEY = 'tp-thumbs-v1'
let cache: Record<string, string> | null = null

function loadCache(): Record<string, string> {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    cache = {}
  }
  return cache!
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache ?? {}))
  } catch {
    /* storage full — drop */
  }
}

/** Lead-image thumbnail URL for a Wikipedia article ('' = known none). */
export async function thumbForArticle(article: string): Promise<string> {
  if (!mediaEnabled || !article) return ''
  const c = loadCache()
  if (article in c) return c[article]
  let url = ''
  try {
    const res = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(article.replace(/ /g, '_')),
    )
    if (res.ok) {
      const d = await res.json()
      url = (d.thumbnail?.source as string | undefined) ?? ''
    }
  } catch {
    return '' // transient — don't cache failures
  }
  c[article] = url
  saveCache()
  return url
}

/** Thumbnail for a person by display name (via the people map). */
export async function thumbForPerson(name: string): Promise<string> {
  if (!mediaEnabled) return ''
  const map = await loadPeople()
  return thumbForArticle(map[name] ?? name)
}
