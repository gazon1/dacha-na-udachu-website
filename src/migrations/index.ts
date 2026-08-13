import * as migration_20260731_234805 from './20260731_234805';
import * as migration_20260813_180430 from './20260813_180430';
import * as migration_20260813_192444 from './20260813_192444';
import * as migration_20260813_add_contributions_lock_rel from './20260813_add_contributions_lock_rel';
import * as migration_20260813_add_contributions_version_columns from './20260813_add_contributions_version_columns';
import * as migration_20260813_add_event_contributions from './20260813_add_event_contributions';

export const migrations = [
  {
    up: migration_20260731_234805.up,
    down: migration_20260731_234805.down,
    name: '20260731_234805',
  },
  {
    up: migration_20260813_180430.up,
    down: migration_20260813_180430.down,
    name: '20260813_180430',
  },
  {
    up: migration_20260813_192444.up,
    down: migration_20260813_192444.down,
    name: '20260813_192444',
  },
  {
    up: migration_20260813_add_contributions_lock_rel.up,
    down: migration_20260813_add_contributions_lock_rel.down,
    name: '20260813_add_contributions_lock_rel',
  },
  {
    up: migration_20260813_add_contributions_version_columns.up,
    down: migration_20260813_add_contributions_version_columns.down,
    name: '20260813_add_contributions_version_columns',
  },
  {
    up: migration_20260813_add_event_contributions.up,
    down: migration_20260813_add_event_contributions.down,
    name: '20260813_add_event_contributions'
  },
];
