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
# 	rm requirements.txt
	poetry export --without-hashes --without-urls | awk '{ print $1 }' FS=';' > requirements.txt

install_req:
	pip install -r requirements.txt

db_migrate:
	flask db migrate
	flask db upgrade