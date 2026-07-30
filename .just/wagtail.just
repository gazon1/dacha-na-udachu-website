# ==============================================================================
# 🏠 WAGTAIL PROJECT AI CONTEXT
# ==============================================================================

workspace_dir := "/workspace"
tmp_context := workspace_dir + "/tmp/wagtail_context.txt"
agents_md := workspace_dir + "/agents.md"

# Base directories for Wagtail/Django project
base_dirs := workspace_dir + "/backend " + workspace_dir + "/frontend/src " + workspace_dir + "/templates"

# Common flags for sing
sing_base := "sing context -o " + tmp_context + " -l python " + base_dirs

# ---- AI CONTEXT ----

[group('ai-context')]
[working-directory(workspace_dir)]
context-wagtail:
    #!/usr/bin/env bash
    set -e
    mkdir -p {{ workspace_dir }}/tmp
    sing context -o {{ tmp_context }} -l python {{ workspace_dir }}/backend {{ workspace_dir }}/frontend \
        --ext '.py' --ext '.html' -e '.css' -e '.js' --aggressive
    echo "✅ Wagtail context saved to {{ tmp_context }}"
    wc -l {{ tmp_context }}

[group('ai-context')]
[working-directory(workspace_dir)]
context-wagtail-full:
    #!/usr/bin/env bash
    set -e
    mkdir -p {{ workspace_dir }}/tmp
    echo "📦 Extracting Python/Django context..."
    sing context -o {{ workspace_dir }}/tmp/wagtail_py.txt -l python {{ workspace_dir }}/backend \
        --ext '.py' --aggressive -v

    echo "🎨 Extracting JS/CSS/TS/TSX context..."
    sing context -o {{ workspace_dir }}/tmp/wagtail_js.txt -l javascript {{ workspace_dir }}/frontend \
        --ext '.js' --ext '.jsx' --ext '.ts' --ext '.tsx' --ext '.css' --aggressive -v

    echo "📄 Extracting templates..."
    sing context -o {{ workspace_dir }}/tmp/wagtail_templates.txt -l html {{ workspace_dir }}/dacha \
        --ext '.html' --aggressive -v

    echo "🔗 Merging contexts..."
    cat {{ workspace_dir }}/tmp/wagtail_py.txt > {{ tmp_context }}
    echo "" >> {{ tmp_context }}
    echo "// ████ JAVASCRIPT/CSS ████" >> {{ tmp_context }}
    cat {{ workspace_dir }}/tmp/wagtail_js.txt >> {{ tmp_context }}
    echo "" >> {{ tmp_context }}
    echo "// ████ TEMPLATES ████" >> {{ tmp_context }}
    cat {{ workspace_dir }}/tmp/wagtail_templates.txt >> {{ tmp_context }}

    echo "🐳 Extracting Docker Compose files..."
    for f in {{ workspace_dir }}/docker-compose*.yml {{ workspace_dir }}/docker-compose*.yaml; do
        if [ -f "$f" ]; then
            echo "" >> {{ tmp_context }}
            echo "// ████ DOCKER: $(basename $f) ████" >> {{ tmp_context }}
            cat "$f" >> {{ tmp_context }}
        fi
    done

    echo "✅ Full context saved to {{ tmp_context }}"
    wc -l {{ tmp_context }}

[group('ai-context')]
[working-directory(workspace_dir)]
context-wagtail-models:
    #!/usr/bin/env bash
    set -e
    mkdir -p {{ workspace_dir }}/tmp
    sing context -o {{ workspace_dir }}/tmp/wagtail_models.txt -l python {{ workspace_dir }}/dacha \
        --pattern 'models.py' --aggressive -v
    cat {{ workspace_dir }}/tmp/wagtail_models.txt

[group('ai-context')]
[working-directory(workspace_dir)]
context-wagtail-templates:
    #!/usr/bin/env bash
    set -e
    mkdir -p {{ workspace_dir }}/tmp
    sing context -o {{ workspace_dir }}/tmp/wagtail_templates.txt -l html {{ workspace_dir }}/dacha \
        --ext '.html' --aggressive -v
    cat {{ workspace_dir }}/tmp/wagtail_templates.txt

[group('ai-context')]
[working-directory(workspace_dir)]
context-wagtail-frontend:
    #!/usr/bin/env bash
    set -e
    mkdir -p {{ workspace_dir }}/tmp
    sing context -o {{ workspace_dir }}/tmp/wagtail_frontend.txt -l javascript {{ workspace_dir }}/frontend/src \
        --ext '.js' --ext '.css' --aggressive -v
    cat {{ workspace_dir }}/tmp/wagtail_frontend.txt
