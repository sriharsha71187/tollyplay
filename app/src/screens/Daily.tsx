import { useMemo, useState } from 'react'
import {
  dailySet,
  loadRecord,
  saveResult,
  shareText,
  todayNumber,
  type DailyRecord,
} from '../game/daily'

const kindLabel = { katha: '📖 KATHA', dialogue: '💬 DIALOGUE', trivia: '🧠 TRIVIA' }

export default function Daily() {
  const day = todayNumber()
  const questions = useMemo(() => dailySet(day), [day])
  const [record, setRecord] = useState<DailyRecord | null>(() => {
    const r = loadRecord()
    return r && r.day === day ? r : null
  })
  const [idx, setIdx] = useState(0)
  const [marks, setMarks] = useState<boolean[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (record) {
    return (
      <div className="flex flex-col gap-6">
        <Head day={day} streak={record.streak} />
        <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
          <p className="font-display text-5xl text-gold-bright">
            {record.score}/5
          </p>
          <p className="mt-3 text-2xl tracking-widest">
            {record.marks.map((m, i) => (
              <span key={i}>{m ? '🟩' : '🟥'}</span>
            ))}
          </p>
          <p className="mt-4 text-on-variant">
            🔥 {record.streak}-day streak · best {record.best}
          </p>
          <button
            onClick={async () => {
              const text = shareText(record)
              if (navigator.share) {
                await navigator.share({ text }).catch(() => {})
              } else {
                await navigator.clipboard.writeText(text)
                setCopied(true)
              }
            }}
            className="mt-6 rounded-full bg-gold px-8 py-3.5 font-display tracking-wider text-on-gold active:scale-95"
          >
            {copied ? 'COPIED!' : 'SHARE'}
          </button>
          <p className="mt-4 text-xs text-on-variant">
            New puzzle at midnight. Come back tomorrow!
          </p>
        </div>
      </div>
    )
  }

  const q = questions[idx]

  function choose(opt: string) {
    if (picked) return
    setPicked(opt)
    const ok = opt === q.answer
    const nextMarks = [...marks, ok]
    setMarks(nextMarks)
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setRecord(saveResult(nextMarks.filter(Boolean).length, nextMarks))
      } else {
        setIdx(idx + 1)
        setPicked(null)
      }
    }, 1100)
  }

  return (
    <div className="flex flex-col gap-6">
      <Head day={day} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          {kindLabel[q.kind]}
        </p>
        <p className="text-xs font-bold text-on-variant">
          {idx + 1} / {questions.length}
        </p>
      </div>
      <div className="-mt-3 flex gap-1.5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < marks.length
                ? marks[i]
                  ? 'bg-success'
                  : 'bg-urgent'
                : i === idx
                  ? 'bg-gold'
                  : 'bg-surface-highest'
            }`}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
        <p
          className={`text-lg leading-relaxed ${
            q.kind === 'dialogue' ? 'italic' : ''
          }`}
        >
          {q.prompt}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {q.options.map((opt) => {
          let cls = 'bg-surface-container active:scale-[0.98]'
          if (picked) {
            if (opt === q.answer) cls = 'bg-success text-surface font-bold'
            else if (opt === picked) cls = 'bg-urgent-deep text-urgent-soft'
            else cls = 'bg-surface-container opacity-50'
          }
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              className={`rounded-2xl px-5 py-3.5 text-left ${cls}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Head({ day, streak }: { day: number; streak?: number }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl text-on-surface/40">DAILY</h1>
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          PUZZLE #{day}
        </p>
      </div>
      {streak !== undefined && (
        <div className="rounded-full bg-surface-container px-4 py-2 text-sm font-bold">
          🔥 {streak}
        </div>
      )}
    </header>
  )
}
