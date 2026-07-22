# ==============================================================================
# 🐳 DEVCONTAINER INITIALIZATION
# ==============================================================================

[group('init')]
[doc('Main initialization command')]
init:
    - just unified-setup
    @echo "✅ Initialization process finished."


[group('init')]
[doc('Setup Zsh, environment, and all dev tools')]
unified-setup:
    @echo "🚀 Setting up Zgenom and Shell..."
    # cd /workspace/ && sudo chown -R 1000:1000 .
    # cd /home/max && sudo chown -R 1000:1000 .
    sudo touch {{LOCK_FILE}} && sudo chown -R 1000:1000 {{LOCK_FILE}}
    just setup-python
    just activate-python-env
    just setup-zgenom
    just setup-eza
    just setup-zshrc
    just setup-opencode-auth
    @echo "✅ Environment setup complete! Type 'zsh' to apply changes."

# ==============================================================================
# 🔧 INDIVIDUAL SETUP COMPONENTS
# ==============================================================================


[group('setup')]
[doc('Install tv (interactive fuzzy finder)')]
[working-directory: "/workspace"]
setup-python:
    #!/usr/bin/env bash
    uv sync --extra dev
    

[group('setup')]
[doc('Install tv (interactive fuzzy finder)')]
[working-directory: "/workspace"]
activate-python-env:
    #!/usr/bin/env bash
    uv sync && source .venv/bin/activate

[group('setup')]
[doc('Install tv (interactive fuzzy finder)')]
[working-directory: "/workspace/tmp"]
setup-tv:
    #!/usr/bin/env bash
    # https://github.com/alexpasmantier/television/releases/tag/0.15.4
    set -e
    sudo dpkg -i tv-0.15.4-x86_64-unknown-linux-gnu.deb
    echo "✅ tv installed"

[group('setup')]
[doc('Install Zgenom (Zsh plugin manager)')]
setup-zgenom:
    #!/usr/bin/env bash
    set -e
    if [ ! -d "$HOME/.zgenom" ]; then
        echo "⚡ Cloning zgenom..."
        git clone https://github.com/jandamm/zgenom.git "$HOME/.zgenom"
    else
        echo "✅ Zgenom already installed"
    fi

[group('setup')]
[doc('Install EZA (modern ls replacement)')]
setup-eza:
    #!/usr/bin/env bash
    set -e
    if ! command -v eza &> /dev/null; then
        echo "📦 Installing eza from GitHub..."
        mkdir -p /tmp/eza
        wget -qO- https://github.com/eza-community/eza/releases/latest/download/eza_x86_64-unknown-linux-gnu.tar.gz | tar xz -C /tmp/eza
        mkdir -p $HOME/.local/bin
        mv /tmp/eza/eza $HOME/.local/bin/eza
        chmod +x $HOME/.local/bin/eza
        rm -rf /tmp/eza
        echo "✅ Eza installed to ~/.local/bin"
    else
        echo "✅ Eza already installed"
    fi

[group('setup')]
[doc('Generate .zshrc configuration file')]
setup-zshrc:
    #!/usr/bin/env bash
    set -e
    cp /workspace/.devcontainer/.zshrc.template "$HOME/.zshrc"
    echo "✅ .zshrc created"

[group('setup')]
[doc('Setup OpenCode authentication')]
setup-opencode-auth:
    #!/usr/bin/env bash
    set -e
    if [ -n "$ZAI_API_KEY" ]; then
        mkdir -p "$HOME/.local/share/opencode"
        echo "{}" > "$HOME/.local/share/opencode/auth.json"
        if command -v jq &> /dev/null; then
            jq --arg key "$ZAI_API_KEY" '."zai-coding-plan" = {"type": "api", "key": $key}' \
               "$HOME/.local/share/opencode/auth.json" > "$HOME/.local/share/opencode/auth.tmp" \
               && mv "$HOME/.local/share/opencode/auth.tmp" "$HOME/.local/share/opencode/auth.json"
            echo "✅ OpenCode auth configured"
        else
            echo "⚠️  jq not found, skipping auth config"
        fi
    else
        echo "ℹ️  ZAI_API_KEY not set, skipping OpenCode auth"
    fi