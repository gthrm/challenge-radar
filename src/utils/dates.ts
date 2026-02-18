const MS_PER_DAY = 1000 * 60 * 60 * 24

export const pad = (value: number) => value.toString().padStart(2, '0')

export const formatDate = (date: Date) => date.toISOString().slice(0, 10)
export const todayKey = () => formatDate(new Date())
export const toDate = (value: string) => new Date(`${value}T00:00:00`)

export const daysBetween = (start: string, end: Date) =>
  Math.floor((end.getTime() - toDate(start).getTime()) / MS_PER_DAY)

export const addMinutesToTime = (time: string, minutes: number) => {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = ((Math.floor(total / 60) % 24) + 24) % 24
  const mm = ((total % 60) + 60) % 60
  return `${pad(hh)}:${pad(mm)}`
}
