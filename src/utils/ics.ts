import type { Challenge } from '../types/challenge'
import { addMinutesToTime, formatDate, pad } from './dates'

export const buildIcs = (challenge: Challenge) => {
  const start = challenge.startDate.replace(/-/g, '')
  const time = challenge.reminderTime.replace(':', '')
  const dtStart = `${start}T${time}00`
  const dtEnd = `${start}T${addMinutesToTime(challenge.reminderTime, 30).replace(':', '')}00`
  const stamp = new Date()
  const dtStamp = `${formatDate(stamp).replace(/-/g, '')}T${pad(stamp.getHours())}${pad(stamp.getMinutes())}00`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Challenge Radar//EN',
    `X-WR-CALNAME:${challenge.title}`,
    'BEGIN:VEVENT',
    `UID:${challenge.id}@challenge-radar`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `RRULE:FREQ=DAILY;COUNT=${challenge.totalDays}`,
    `SUMMARY:${challenge.title}`,
    `DESCRIPTION:${challenge.description ?? 'Daily check-in'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${challenge.title} check-in`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
