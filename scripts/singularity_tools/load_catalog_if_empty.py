#!/usr/bin/env python3
"""
Checks if crawl_targets is empty and loads it from catalog YAML via load_catalog_to_pg.py.
"""
import subprocess
from pathlib import Path

import click
from loguru import logger

CATALOG_YAML = Path("/tmp/catalog_pg.yaml")


def get_pg_value(host: str, port: int, db: str, user: str, password: str, sql: str) -> str | None:
    result = subprocess.run(
        ["psql", "-h", host, "-p", str(port), "-d", db, "-U", user, "-t", "-c", sql],
        env={"PGPASSWORD": password},
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def is_crawl_targets_empty(host: str, port: int, db: str, user: str, password: str) -> bool:
    val = get_pg_value(host, port, db, user, password, "SELECT COUNT(*) FROM crawl_targets;")
    return val is None or val == "" or int(val) == 0


def run_load_script(yaml_path: Path, db_host: str, db_port: int, db_name: str,
                    db_user: str, db_password: str) -> int:
    cmd = [
        "/usr/local/bin/python3", "/scripts/singularity_tools/load_catalog_to_pg.py",
        str(yaml_path),
        "--db-host", db_host,
        "--db-port", str(db_port),
        "--db-name", db_name,
        "--db-user", db_user,
        "--db-password", db_password,
    ]
    result = subprocess.run(cmd, env={"PGPASSWORD": db_password}, cwd="/scripts/singularity_tools")
    return result.returncode


@click.command()
@click.option("--db-host", default="postgres")
@click.option("--db-port", default=5432, type=int)
@click.option("--db-name", required=True)
@click.option("--db-user", required=True)
@click.option("--db-password", required=True)
def main(db_host: str, db_port: int, db_name: str, db_user: str, db_password: str):
    logger.info("Checking if crawl_targets is empty...")
    if not is_crawl_targets_empty(db_host, db_port, db_name, db_user, db_password):
        logger.info("crawl_targets already has data — skipping.")
        return

    if not CATALOG_YAML.exists():
        logger.error(f"Catalog YAML not found: {CATALOG_YAML}")
        raise click.Abort()

    logger.info(f"DB is empty — loading catalog from {CATALOG_YAML}...")
    rc = run_load_script(CATALOG_YAML, db_host, db_port, db_name, db_user, db_password)
    if rc != 0:
        logger.error(f"load_catalog_to_pg.py FAILED with code {rc}")
        raise click.Abort()

    logger.success("Catalog loaded successfully.")


if __name__ == "__main__":
    main()
