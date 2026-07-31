#!/bin/bash
set -e

echo "🚀 Finalizing environment with Zgenom..."

# 1. Установка Zgenom (если нет)
if [ ! -d "$HOME/.zgenom" ]; then
    echo "⚡ Cloning zgenom..."
    git clone https://github.com/jandamm/zgenom.git "$HOME/.zgenom"
fi

# 2. Создание .zshrc (Ваш конфиг)
cat > "$HOME/.zshrc" <<'EOF'
# --- Настройки Zgenom ---
source "$HOME/.zgenom/zgenom.zsh"
alias zgen=zgenom

# 1. Установка EZA (Manual Install - самый надежный метод)
# Проверяем, есть ли eza, чтобы не качать каждый раз
if ! command -v eza &> /dev/null; then
    echo "📦 Installing eza from GitHub..."
    mkdir -p /tmp/eza
    # Качаем последний релиз
    wget -qO- https://github.com/eza-community/eza/releases/latest/download/eza_x86_64-unknown-linux-gnu.tar.gz | tar xz -C /tmp/eza
    # Перемещаем бинарник в папку пользователя (чтобы не нужен был sudo)
    mkdir -p $HOME/.local/bin
    mv /tmp/eza/eza $HOME/.local/bin/eza
    chmod +x $HOME/.local/bin/eza
    rm -rf /tmp/eza
    echo "✅ Eza installed to ~/.local/bin"
fi

# Проверяем, существует ли файл инициализации
if ! zgen saved; then
    echo "⚡ Инициализация плагинов zgenom..."

    # EZA (Modern ls)
    zgenom bin eza-community/eza
    
    # FZF (Fuzzy Finder)
    zgenom bin junegunn/fzf
    
    # ast-grep (Smart Search)
    zgenom bin ast-grep/ast-grep

    # 3. ПОДСКАЗКИ И АВТОДОПОЛНЕНИЕ
    zgenom load zsh-users/zsh-autosuggestions
    zgenom load zsh-users/zsh-completions
    zgenom load zsh-users/zsh-syntax-highlighting
    zgenom load zsh-users/zsh-history-substring-search

    # --- 2. ПЛАГИНЫ ZSH ---
    zgenom oh-my-zsh
    zgenom load zsh-users/zsh-syntax-highlighting
    zgenom load zsh-users/zsh-autosuggestions

    zgenom oh-my-zsh plugins/git
    zgenom oh-my-zsh plugins/sudo
    zgenom oh-my-zsh plugins/docker
    zgenom oh-my-zsh plugins/zoxide
    zgenom oh-my-zsh plugins/fzf 

    # --- 3. ТЕМА ---
    zgenom load spaceship-prompt/spaceship-prompt spaceship
    
    zgenom save
fi

# --- Настройки Spaceship ---
SPACESHIP_TIME_SHOW=true
SPACESHIP_USER_SHOW=always

# --- Настройки подсказок ---
# Принимать подсказку (серый текст) по Ctrl+Space или Стрелке вправо
bindkey '^ ' autosuggest-accept
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=242' # Цвет подсказки

# Поиск по истории стрелками вверх/вниз (с учетом введенного текста)
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# Отключаем привязку PgUp/PgDown к истории, чтобы работал скролл терминала
bindkey -r "^[[5~" # PageUp
bindkey -r "^[[6~" # PageDown


# --- SUPER ALIASES (Eza, Bat, Ripgrep) ---

# Проверяем, появилась ли eza (она должна быть в PATH после zgenom init)
# Но так как PATH обновляется динамически, используем алиас с проверкой
alias ls='eza --icons --group-directories-first'
alias ll='eza --icons -l --group-directories-first'
alias lst='eza --icons -l --sort=modified --group-directories-first'
alias tree='eza --icons --tree'

# Остальные замены
alias cat='bat -p'
alias grep='rg'
alias find='fd'

# --- Пользовательские алиасы ---
alias check_wifi="ping 8.8.8.8"
alias show_ip="curl -s https://ipinfo.io/ip"

# --- Настройки истории ---
HISTSIZE=10000
SAVEHIST=10000
setopt APPEND_HISTORY
setopt SHARE_HISTORY

# Инструменты
export PATH="$HOME/.bun/bin:$PATH"
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
eval "$(zoxide init zsh)"
EOF

# 3. OpenCode Auth
if [ -n "$ZAI_API_KEY" ]; then
    mkdir -p "$HOME/.local/share/opencode"
    echo "{}" > "$HOME/.local/share/opencode/auth.json"
    jq --arg key "$ZAI_API_KEY" '."zai-coding-plan" = {"type": "api", "key": $key}' \
       "$HOME/.local/share/opencode/auth.json" > "$HOME/.local/share/opencode/auth.tmp" \
       && mv "$HOME/.local/share/opencode/auth.tmp" "$HOME/.local/share/opencode/auth.json"
fi

echo "✅ Environment ready! Type 'zsh' to apply changes."
