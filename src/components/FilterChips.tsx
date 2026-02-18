import type { Filter } from '../types/challenge'

type Props = {
  filter: Filter
  counts: Record<Filter | 'all', number>
  onChange: (filter: Filter) => void
}

const filters: Filter[] = ['today', 'active', 'completed', 'upcoming', 'all']

export const FilterChips = ({ filter, counts, onChange }: Props) => (
  <div className="chip-row filters">
    {filters.map((key) => (
      <button
        key={key}
        type="button"
        className={`chip ${filter === key ? 'chip-active' : ''}`}
        onClick={() => onChange(key)}
      >
        {key === 'today' && `Today (${counts.today})`}
        {key === 'active' && `Active (${counts.active})`}
        {key === 'completed' && `Completed (${counts.completed})`}
        {key === 'upcoming' && `Upcoming (${counts.upcoming})`}
        {key === 'all' && `All (${counts.all})`}
      </button>
    ))}
  </div>
)
