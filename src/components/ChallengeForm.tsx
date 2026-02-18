import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { FormState } from '../types/challenge'

type Template = { label: string; data: Partial<FormState> }

type Props = {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  message: string
  setMessage: Dispatch<SetStateAction<string>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  templates: Template[]
}

export const ChallengeForm = ({ form, setForm, message, setMessage, onSubmit, templates }: Props) => {
  const handleChange = (name: keyof FormState, value: string | number | boolean) => {
    setForm({
      ...form,
      [name]: name === 'totalDays' ? Number(value) : value,
    } as FormState)
  }

  const applyTemplate = (data: Partial<FormState>) => {
    setForm((prev) => ({
      ...prev,
      ...data,
      startDate: prev.startDate || new Date().toISOString().slice(0, 10),
    }))
    setMessage(`Loaded template: ${data.title ?? 'preset'}`)
  }

  return (
    <>
      <div className="template-row">
        <p className="tiny muted">Templates</p>
        <div className="chip-row">
          {templates.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip"
              onClick={() => applyTemplate(preset.data)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="30 days of photos"
            required
          />
        </label>

        <label className="field full">
          <span>Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What does success look like?"
            rows={2}
          />
        </label>

        <label className="field">
          <span>Start date</span>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Days</span>
          <input
            type="number"
            min={1}
            max={365}
            name="totalDays"
            value={form.totalDays}
            onChange={(e) => handleChange('totalDays', e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Reminder time</span>
          <input
            type="time"
            name="reminderTime"
            value={form.reminderTime}
            onChange={(e) => handleChange('reminderTime', e.target.value)}
            required
          />
        </label>

        <label className="field toggle">
          <span>Notifications</span>
          <div className="toggle-wrap">
            <input
              type="checkbox"
              name="remindersOn"
              checked={form.remindersOn}
              onChange={(event) => handleChange('remindersOn', event.target.checked)}
            />
            <span>{form.remindersOn ? 'On' : 'Off'}</span>
          </div>
        </label>

        <div className="actions full">
          <button type="submit" className="primary">
            Add challenge
          </button>
          <div className="hints-stack">
            {message && <span className="hint">{message}</span>}
            <span className="hint">Tip: enable reminders or drop the .ics into your calendar.</span>
          </div>
        </div>
      </form>
    </>
  )
}
