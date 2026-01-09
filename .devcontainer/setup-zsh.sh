#!/bin/bash

# Определяем путь к кастомной папке Oh My Zsh
ZSH_CUSTOM=${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}

# 1. Установка темы SPACESHIP
if [ ! -d "$ZSH_CUSTOM/themes/spaceship-prompt" ]; then
    echo "Installing Spaceship theme..."
    git clone https://github.com/spaceship-prompt/spaceship-prompt.git "$ZSH_CUSTOM/themes/spaceship-prompt" --depth=1
    ln -s "$ZSH_CUSTOM/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH_CUSTOM/themes/spaceship.zsh-theme"
fi

# 2. Установка плагинов (autosuggestions и syntax-highlighting)
# (git и z уже встроены в Oh My Zsh, их качать не надо)
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
    echo "Installing zsh-autosuggestions..."
    git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
fi

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
    echo "Installing zsh-syntax-highlighting..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"
fi

# 3. Настройка .zshrc
# Меняем тему на spaceship
sed -i 's/^ZSH_THEME=.*/ZSH_THEME="spaceship"/' $HOME/.zshrc

# Включаем плагины (git, z, autosuggestions, syntax-highlighting)
# Используем sed для замены строки plugins=(...)
sed -i 's/^plugins=(.*/plugins=(git z zsh-autosuggestions zsh-syntax-highlighting)/' $HOME/.zshrc

eval "$(just --completions zsh)"

echo "Zsh configuration complete!"