# ==============================================================================
# 🤖 AI PIPELINE
# ==============================================================================

workspace_dir := "/workspace"
tmp_context   := workspace_dir + "/tmp/context.txt"
agents_md     := workspace_dir + "/agents.md"

# Базовые папки, которые нужны в обоих рецептах
base_dirs     := workspace_dir + "/WebCrawler " + \
                 workspace_dir + "/WebCrawler.Core " + \
                 workspace_dir + "/WebCrawler.Domain " + \
                 workspace_dir + "/WebCrawler.Infrastructure " + \
                 workspace_dir + "/WebCrawler.Tests"


# Общие флаги для запуска sing
sing_base     := "sing context -o " + tmp_context + " -l csharp " + base_dirs


[group('ai-context')]
[working-directory: "/workspace"]
context-py-scripts:
    #!/usr/bin/env bash
    set -e
    sing context -o /workspace/tmp/context.txt -l python /workspace/scripts/singularity_tools 


[group('ai-context')]
[working-directory: workspace_dir]
context-project:
    @echo "Running: {{ sing_base }} --agent-md {{ agents_md }}"
    {{ sing_base }} --agent-md {{ agents_md }}

[group('ai-context')]
[working-directory: workspace_dir]
context-project-web:
    {{ sing_base }} {{ workspace_dir }}/WebCrawler.Admin -e csproj -e json -e razor --agent-md {{ agents_md }}

[group('ai-context')]
[working-directory: "/workspace/tmp/prod/"]
context-py-crawler-project:
    sing context -o /workspace/tmp/prod_py_context.txt -l python . --ignore-dirs 'tests,tg_bot,scripts,leave_review,alembic,logs,tmp,wb_leave_review.py'


[group('docs')]
[working-directory: "/workspace/"]
start-docs:
    #!/usr/bin/env bash
    set -e
    just install-proj
    docfx build
    docfx serve _site


[group('docs')]
[working-directory: "/home/max/tmp"]
doc-to-pdf:
    #!/usr/bin/env bash
    set -e
    # mkdir tmp
    # cd tmp
    rm -rf website
    git clone --depth 1 --no-checkout https://github.com/flutter/website.git
    cd website
    git sparse-checkout set sites/docs/src/content
    git checkout
    sing compile-docs /home/max/tmp/website/sites/docs/src/content

[group('ai')]
[doc('Интерактивный выбор эпика для запуска')]
pick-epic:
    #!/usr/bin/env bash
    set -e
    epic=$(bd query "type=epic AND status=open" --limit 0 | \
        grep -o "workspace-[a-z0-9]*" | \
        tv --preview-command "bd show '{}'" | \
        head -n1)

[group('ui')]
[doc('📄 Fuzzy-поиск файлов в lib/')]
find-file path='/workspace/Crawler':
    #!/usr/bin/env bash
    set -e
    file=$(fd -t f . "{{path}}" | \
        tv --preview-command "bat -n --color=always '{}'" 2>/dev/null || true)
    [ -n "$file" ] && nvim "$file"

[group('ui')]
[doc('Интерактивный выбор и запуск рецепта')]
pick-recipe:
    #!/usr/bin/env bash
    set -e
    # Получаем список рецептов, фильтруем приватные
    recipe=$(just --list --unsorted | \
        grep -v '^Available\|^\[' | \
        awk '{print $1}' | \
        grep -v '^_' | \
        tv --source-command "cat" --preview-command "just --show '{}'" | \
        head -n1)
    
    if [ -n "$recipe" ]; then
        echo "🚀 Запускаю: just $recipe"
        just "$recipe"
    fi

[group('ai')]
[doc('Launch a single epic with optional model')]
spawn-agent id model=MODEL:
    @just _run-pipeline "{{id}}" "single" "{{id}}" "{{model}}"

# Usage: just run-batch "epic-1 epic-2" "openai/gpt-4o"
#   just run-batch "epic-1 epic-2"           # single group
#   just run-batch "setup | core | cleanup"  # three groups
[group('ai')]
[doc('Run batch processing with group support')]
run-batch epics="" model=MODEL:
    #!/usr/bin/env bash
    set -e
    SCRIPT="/workspace/Crawler/scripts/python/singularity_tools/run_batch.py"

    if [ -n "{{epics}}" ]; then
        python3 "$SCRIPT" "{{epics}}" --model "{{model}}"
    else
        python3 "$SCRIPT" --from-beads --model "{{model}}"
    fi

# ==============================================================================
# ⚙️ INTERNAL PIPELINE (PRIVATE RECIPES)
# ==============================================================================

[private]
[doc('Universal pipeline: Prepare -> Execute -> Merge')]
_run-pipeline id mode target_epics model: (_prepare-worktree id) (_execute-agent id mode target_epics model) (_merge-and-cleanup id)
    @echo "🎉 Pipeline for {{id}} completed."


[private]
[doc('Step 1: Prepare worktree environment')]
_prepare-worktree id:
    #!/usr/bin/env bash
    set -e
    LOCATION="{{WORKTREES_BASE}}/{{id}}"
    BRANCH="{{BRANCH_PREFIX}}{{id}}"

    echo "🏗️ [{{id}}] Preparing..."
    mkdir -p {{WORKTREES_BASE}}

    if [ -d "$LOCATION" ]; then
        echo "🔄 Worktree found. Updating from main..."
        cd "$LOCATION"
        git checkout "$BRANCH" || git checkout -b "$BRANCH"
        git fetch origin main
        git merge main --no-edit || (echo "⚠️ Could not merge main, continuing..." && true)
    else
        echo "✨ Creating new worktree..."
        if git branch | grep -q "$BRANCH"; then
            echo "🌿 Using existing branch $BRANCH"
            git worktree add "$LOCATION" "$BRANCH"
        else
            echo "🌱 Creating new branch $BRANCH"
            git worktree add -b "$BRANCH" "$LOCATION" main
        fi
    fi

    ln -sf /workspace/Crawler/.beads "$LOCATION/Crawler/.beads"
    ln -sf /workspace/Crawler/.beads "$LOCATION/.beads"
    
    (cd "$LOCATION/Crawler" && \
     rm -f pubspec.lock && \
     flutter clean && \
     flutter pub get || \
     (echo "⚠️ Flutter pub get failed, continuing..." && true))


[private]
[env("BEADS_DIR", "{{LOCATION}}/.beads")]
[doc('Step 2: Execute AI agent')]
_execute-agent id mode target_epics model:
    #!/usr/bin/env bash
    set -x

    LOCATION="{{WORKTREES_BASE}}/{{id}}"
    BRANCH="{{BRANCH_PREFIX}}{{id}}"
    INPUT_FILE="/tmp/ai_input_{{id}}.txt"

    cd "$LOCATION"

    SYSTEM_PROMPT='{{AGENT_SYSTEM_INSTRUCTIONS}}'

    if [ "{{mode}}" == "single" ]; then
        TASK="Твоя задача: Полностью реализовать ЭПИК {{target_epics}}."
    else
        TASK="Твоя задача — последовательно реализовать и закрыть следующие эпики: {{target_epics}}. Не останавливайся, пока не закроешь все."
    fi

    echo "🤖 [{{id}}] Starting AI in: $LOCATION"
    echo "✨ No cache. Starting new session... model {{model}}"

    printf "%s\n\nДАННЫЕ ТЕКУЩЕЙ ЗАДАЧИ:\n%s" \
        "{{AGENT_SYSTEM_INSTRUCTIONS}}" \
        "$TASK" > "$INPUT_FILE"

    opencode run \
        -m "{{model}}" \
        "$(cat $INPUT_FILE)"

    rm -f "$INPUT_FILE"

    if [ -d "$LOCATION/Crawler" ]; then
        cd "$LOCATION/Crawler" && dart format . > /dev/null || true
    fi


[private]
[doc('Step 3: Merge and cleanup with conflict resolution')]
_merge-and-cleanup id:
    #!/usr/bin/env bash
    LOCATION="{{WORKTREES_BASE}}/{{id}}"
    BRANCH="{{BRANCH_PREFIX}}{{id}}"

    COMMIT_SUCCESS=false
    MERGE_SUCCESS=false

    cleanup() {
        echo "🔄 [{{id}}] Finalizing..."

        if [ "$COMMIT_SUCCESS" = true ]; then
            echo "🧹 Removing worktree directory: $LOCATION..."
            git worktree remove --force "$LOCATION" 2>/dev/null || true
        else
            echo "⚠️  CRITICAL: Worktree $LOCATION is PRESERVED."
            echo "Reason: Git commit failed inside the worktree."
        fi

        if [ "$COMMIT_SUCCESS" = true ] && [ "$MERGE_SUCCESS" = true ]; then
            echo "🌿 Merge successful. Deleting branch $BRANCH."
            git branch -D "$BRANCH" 2>/dev/null || true
        else
            echo "⚠️  KEEPING branch $BRANCH for manual inspection."
            echo "Status: Commit=$COMMIT_SUCCESS, Merge=$MERGE_SUCCESS"
        fi
    }
    trap cleanup EXIT

    echo "💅 Formatting code..."
    cd $LOCATION && dart format . > /dev/null 2>&1 || true

    cd "$LOCATION"
    if [ -n "$(git status --porcelain)" ]; then
        echo "📦 Creating commit in worktree..."
        git add .
        MSG=$(cat .ai_commit_msg 2>/dev/null || echo "agent[{{id}}]: completed tasks")

        if [ -z "$MSG" ]; then
            echo "🔍 ai_commit_msg is empty. Fetching from Beads..."
            BEADS_INFO=$(bd show {{id}} | head -n 1)
            MSG="agent[{{id}}]: $BEADS_INFO"
        fi

        if git commit -m "$MSG"; then
            COMMIT_SUCCESS=true
        else
            echo "❌ ERROR: git commit failed."
            exit 1
        fi
    else
        echo "⚪ No changes to commit."
        COMMIT_SUCCESS=true
    fi

    cd /workspace
    echo "⏳ [{{id}}] Acquiring merge lock..."

    (
        flock -x 200

        echo "🔄 [{{id}}] Merging $BRANCH..."
        if git merge "$BRANCH" --no-edit; then
            echo "✅ Success!"
            MERGE_SUCCESS=true

            echo "📤 Pushing to origin/main..."
            if git push origin main; then
                echo "✅ Push successful!"
            else
                echo "⚠️  Push failed, but merge was successful."
            fi
        else
            echo "❌ ERROR: Conflict in git merge."
            git merge --abort
        fi

    ) 200> {{LOCK_FILE}}

# ==============================================================================
# 🚑 HELPERS
# ==============================================================================

[group('ai')]
[doc('Resolve git merge conflicts with AI assistance')]
_fix-conflict branch:
    @echo "🚑 Conflict resolution for {{branch}}..."
    opencode run --attach {{SERVER_URL}} "Fix git merge conflict in {{branch}}."
