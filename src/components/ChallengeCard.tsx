import { useState, type ChangeEvent } from 'react'
import type { Challenge, Progress } from '../types/challenge'

type Props = {
  challenge: Challenge
  progress: Progress
  currentDay: number
  startsInDays: number
  doneToday: boolean
  onToggleToday: (id: string) => void
  onToggleReminders: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<Challenge>) => void
  onDownload: (challenge: Challenge) => void
}

export const ChallengeCard = ({
  challenge,
  progress,
  currentDay,
  startsInDays,
  doneToday,
  onToggleToday,
  onToggleReminders,
  onRemove,
  onUpdate,
  onDownload,
}: Props) => {
  const [isEditing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: challenge.title,
    description: challenge.description ?? '',
    startDate: challenge.startDate,
    totalDays: challenge.totalDays,
    reminderTime: challenge.reminderTime,
    remindersOn: challenge.remindersOn,
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setDraft((prev) => ({
      ...prev,
      [name]: name === 'totalDays' ? Number(value) : value,
    }))
  }

  const handleSave = () => {
    if (!draft.title.trim()) return
    onUpdate(challenge.id, {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      startDate: draft.startDate,
      totalDays: Math.max(1, Number.isNaN(draft.totalDays) ? 1 : draft.totalDays),
      reminderTime: draft.reminderTime,
      remindersOn: draft.remindersOn,
    })
    setEditing(false)
  }

  const resetDraft = () => {
    setDraft({
      title: challenge.title,
      description: challenge.description ?? '',
      startDate: challenge.startDate,
      totalDays: challenge.totalDays,
      reminderTime: challenge.reminderTime,
      remindersOn: challenge.remindersOn,
    })
    setEditing(false)
  }

  return (
    <article className="challenge-card">
      <header className="challenge-head">
        <div>
          <p className="eyebrow">{startsInDays > 0 ? 'Upcoming' : 'In progress'}</p>
          <h3>{challenge.title}</h3>
        </div>
        <div className="actions-row compact">
          {!isEditing && (
            <button className="ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="ghost" onClick={() => onRemove(challenge.id)}>
            Remove
          </button>
        </div>
      </header>

      {isEditing ? (
        <div className="edit-grid">
          <label className="field">
            <span>Title</span>
            <input name="title" value={draft.title} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="date" name="startDate" value={draft.startDate} onChange={handleChange} required />
          </label>
          <label className="field">
            <span>Days</span>
            <input
              type="number"
              min={1}
              max={365}
              name="totalDays"
              value={draft.totalDays}
              onChange={handleChange}
              required
            />
          </label>
          <label className="field">
            <span>Reminder time</span>
            <input
              type="time"
              name="reminderTime"
              value={draft.reminderTime}
              onChange={handleChange}
              required
            />
          </label>
          <label className="field full">
            <span>Description</span>
            <textarea name="description" value={draft.description} onChange={handleChange} rows={2} />
          </label>
          <label className="field toggle">
            <span>Notifications</span>
            <div className="toggle-wrap">
              <input
                type="checkbox"
                name="remindersOn"
                checked={draft.remindersOn}
                onChange={(event) => setDraft((prev) => ({ ...prev, remindersOn: event.target.checked }))}
              />
              <span>{draft.remindersOn ? 'On' : 'Off'}</span>
            </div>
          </label>
          <div className="actions-row full">
            <button type="button" className="primary" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="ghost" onClick={resetDraft}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {challenge.description && <p className="description">{challenge.description}</p>}

          <div className="meta">
            <span>Start {challenge.startDate}</span>
            <span>
              Day {Math.max(1, currentDay)} / {challenge.totalDays}
            </span>
            <span className={`pill ${progress.status}`}>
              {progress.status === 'completed'
                ? 'Completed'
                : progress.status === 'behind'
                  ? 'Catch up'
                  : 'On track'}
            </span>
          </div>

          <div className="progress">
            <div className="bar" style={{ width: `${progress.percent}%` }} />
            <div className="progress-text">
              <span>{progress.percent}%</span>
              <span>
                {progress.done} of {challenge.totalDays} days checked in
              </span>
            </div>
          </div>

          <div className="actions-row">
            <button
              className={doneToday ? 'success' : 'primary'}
              disabled={startsInDays > 0 || progress.status === 'completed'}
              onClick={() => onToggleToday(challenge.id)}
            >
              {doneToday ? 'Checked in today' : 'Mark today done'}
            </button>

            <button className="ghost" onClick={() => onToggleReminders(challenge.id)}>
              {challenge.remindersOn ? 'Pause reminders' : 'Resume reminders'}
            </button>

            <button className="ghost" onClick={() => onDownload(challenge)}>
              Add to calendar
            </button>
          </div>

          <div className="footline">
            <span>
              Reminder at {challenge.reminderTime} {challenge.remindersOn ? '(on)' : '(off)'}
            </span>
            {startsInDays > 0 && <span>Starts in {startsInDays} days</span>}
          </div>
        </>
      )}
    </article>
  )
}
