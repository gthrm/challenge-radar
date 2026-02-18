import type { Challenge } from '../types/challenge'
import { buildProgress } from '../hooks/useChallengeData'
import { daysBetween } from '../utils/dates'

type Props = {
  challenges: Challenge[]
  today: string
  now: Date
  onToggleToday: (id: string) => void
  onDownload: (challenge: Challenge) => void
}

export const TodayList = ({ challenges, today, now, onToggleToday, onDownload }: Props) => {
  if (challenges.length === 0) {
    return (
      <div className="empty">
        <p>Nothing to check off today. Upcoming challenges will land here automatically.</p>
      </div>
    )
  }

  return (
    <div className="today-grid">
      {challenges.map((challenge) => {
        const progress = buildProgress(challenge, now)
        const doneToday = !!challenge.entries[today]
        return (
          <div key={challenge.id} className="today-card">
            <div>
              <p className="eyebrow small">Reminder at {challenge.reminderTime}</p>
              <h3>{challenge.title}</h3>
              <p className="tiny muted">
                Day {Math.min(challenge.totalDays, daysBetween(challenge.startDate, now) + 1)} • {progress.percent}%
                complete
              </p>
            </div>
            <div className="today-actions">
              <button className={doneToday ? 'success' : 'primary'} onClick={() => onToggleToday(challenge.id)}>
                {doneToday ? 'Checked in' : 'Mark today done'}
              </button>
              <button className="ghost" onClick={() => onDownload(challenge)}>
                Add to calendar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
