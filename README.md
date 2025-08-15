# Сайт для дачи
Code for website for renting rural houses to relax outdoor

# Инструменты для разработки

## Запуск Devcontainer

Для работы в изолированном окружении и в интерфейсе VSCode используется плагин Devcontainer.

Для его использования нужно:
1. [Установить Docker](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) на локальной машине
2. [Установить плагин Devcontainer](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) в VSCode
3. Создать файл .env из .env.example в папке .devcontainer и заполнить его.

Для работы над проектом достаточно запустить его:
1. Нажмите в VSCode в папке проекта комбинацию клавиш **CTRL+SHFT+P**
2. В поисковой строке введите: **Dev Containers: Reopen in Container**

Конфигурация содержится в файле .devcontainer/devcontainer.json.
Так при запуске Devcontainer запускается Docker-контейнер из файла .devcontainer/docker-compose.yaml



### Добавление, изменение или удаление зависимостей

Измения зависимостей делаются в файле pyproject.toml.

Обновление зависимостей в окружении и фиксация их в requrements.txt:

```bash
make update-deps
```

## Проверка кода

### Использование линтера

Используется линтер ruff. Конфиг находится в файле pyproject.toml

```bash
make linter
```
