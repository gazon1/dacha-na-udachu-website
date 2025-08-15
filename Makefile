SHELL := /bin/bash

install:
	@echo "Установка зависимостей..."
	source dacha/bin/activate
	poetry self add poetry-plugin-export
flask:
	flask run

update:
	poetry update

req:
	poetry export --without-hashes --format=requirements.txt > requirements.txt

db_migrate:
	flask db migrate
	flask db upgrade