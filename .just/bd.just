# ==============================================================================
# 📋 BEADS DATABASE MANAGEMENT
# ==============================================================================

[group('beads')]
[doc('Reopen epic and all its closed subtasks')]
reopen-epic id:
    @echo "Reopening epic {{id}} and its closed subtasks..."
    bd reopen {{id}} $(bd query "parent={{id}} AND status=closed" -a | grep -o "{{id}}\.[0-9]*")

[group('beads')]
[doc('List all open epics')]
list-pending-epics:
    @bd query "type=epic AND status=open" --limit 0 | grep -o "workspace-[a-z0-9]*" | sort | uniq

[group('beads')]
[doc('Change issue type to epic')]
change-type id:
    @bd update {{id}} --type epic

[group('beads')]
[doc('Show all tasks for an epic')]
epic id:
    bd query "parent={{id}}"

[group('beads')]
[doc('Show latest 5 epics')]
bdt n='5':
    bd query "type=epic" --json | jq 'sort_by(.created_at) | reverse | .[0:{{n}}]'
