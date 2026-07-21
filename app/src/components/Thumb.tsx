import { useEffect, useState } from 'react'
import { mediaEnabled, thumbForArticle, thumbForPerson } from '../lib/media'

/**
 * Wikipedia lead-image thumbnail. Renders nothing when media is disabled
 * (public builds) and a fallback monogram when no image exists.
 */
export default function Thumb({
  article,
  person,
  label,
  className = '',
  fallback = true,
}: {
  article?: string | null
  person?: string
  label?: string
  className?: string
  fallback?: boolean
}) {
  const [url, setUrl] = useState<string>('')
  const [broken, setBroken] = useState(false)
  const key = article ?? person ?? ''

  useEffect(() => {
    let dead = false
    setUrl('')
    setBroken(false)
    if (!mediaEnabled || !key) return
    const p = article ? thumbForArticle(article) : thumbForPerson(person!)
    p.then((u) => {
      if (!dead) setUrl(u)
    })
    return () => {
      dead = true
    }
  }, [article, person, key])

  if (!mediaEnabled) return null
  if (!url || broken) {
    if (!fallback) return null
    return (
      <div
        className={`flex items-center justify-center bg-surface-highest font-display text-2xl text-on-variant ${className}`}
      >
        {(label ?? key).slice(0, 1).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={label ?? key}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-cover ${className}`}
    />
  )
}
