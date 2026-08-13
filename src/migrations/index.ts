import * as migration_20260731_234805 from './20260731_234805'
import * as migration_20260813_add_event_contributions from './20260813_add_event_contributions'

export const migrations = [
  {
    up: migration_20260731_234805.up,
    down: migration_20260731_234805.down,
    name: '20260731_234805',
  },
  {
    up: migration_20260813_add_event_contributions.up,
    down: migration_20260813_add_event_contributions.down,
    name: '20260813_add_event_contributions',
  },
]