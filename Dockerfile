ARG BASE_PYTHON_VERSION=3.12

FROM python:${BASE_PYTHON_VERSION}-slim AS base

ARG USERNAME
ARG USER_UID
ARG USER_GID

ENV SHELL=/bin/bash \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # uv settings for Docker
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Добавление нового пользователя
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} -s /bin/bash \
    && apt update \
    && apt install -y sudo \
    && echo ${USERNAME} ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin \ 
    && apt install -y --no-install-recommends \
    git \
    gettext \
    libpq-dev \
    gcc \
    netcat-openbsd \
    make \
    tmux \
    htop \ 
    curl \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- ЭТАП 2: Development (Только для devcontainer) ---
FROM base AS development

ARG GIT_EMAIL
ARG GIT_NAME

RUN git config --global user.name "${GIT_NAME}" \
  && git config --global user.email "${GIT_EMAIL}" \
  && git config --global credential.helper store

# --- ЭТАП 3: Production (Финальный образ) ---
FROM base AS production

WORKDIR /app

# Важно: Сначала копируем файл зависимостей и устанавливаем их,
# чтобы использовать кэш Docker
COPY pyproject.toml uv.lock* /app/

# Теперь копируем код проекта
COPY --chown=${USERNAME}:${USERNAME} . /app/

USER ${USERNAME}