# docker build --no-cache -t my-django-cms-base -f .devcontainer/Dockerfile.base .
FROM my-django-cms-base


ARG USERNAME=$USERNAME
ARG USER_UID=$USER_UID
ARG USER_GID=$USER_UID

# --- УПРОЩЕННЫЙ И НАДЕЖНЫЙ БЛОК НАСТРОЙКИ ---
RUN apt-get update && apt-get install -y sudo && \
    # Создаем группу, если ее нет, или переименовываем существующую
    if getent group $USER_GID > /dev/null; then groupmod -n $USERNAME $(getent group $USER_GID | cut -d: -f1); else groupadd --gid $USER_GID $USERNAME; fi && \
    # Создаем пользователя, если его нет, или переименовываем существующего (без флага -m)
    if getent passwd $USER_UID > /dev/null; then usermod -l $USERNAME -d /home/$USERNAME -g $USERNAME $(getent passwd $USER_UID | cut -d: -f1); else useradd --uid $USER_UID --gid $USERNAME -m --shell /bin/zsh $USERNAME; fi && \
    # Выдаем sudo-права
    echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# Создаем рабочую директорию, если она вдруг не создалась
ENV JUST_TEMPDIR="/tmp/just" \
    SHELL=/bin/bash \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Указываем uv устанавливать пакеты прямо в системный Python (без виртуального окружения venv)
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy 

RUN mkdir -p /workspace /home/$USERNAME && \
    mkdir -p "${JUST_TEMPDIR}"
RUN chown -R $USERNAME:$USERNAME "${JUST_TEMPDIR}"


RUN mkdir -p /workspace/.config && chown -R $USERNAME:$USERNAME /workspace


# Устанавливаем zsh
RUN chsh -s /bin/zsh $USERNAME

# Добавляем путь в системную переменную PATH прямо в образе
ENV PATH="/home/max/.bun/bin:${PATH}"
RUN git config --global user.name 'Max Drobin' && \
    git config --global user.email 'newbox2517@inbox.ru' && \
    git config --global credential.helper store && \
    git config --global --add safe.directory /sdks/flutter


USER $USERNAME
RUN sudo chown -R $USERNAME:$USERNAME /home/$USERNAME
WORKDIR /workspace