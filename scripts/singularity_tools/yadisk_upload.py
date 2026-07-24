"""Upload files to Yandex Disk."""

import os
from pathlib import Path

import click
import yadisk

ENV_FILE = Path("/workspace/.devcontainer/.env")


def load_env_token() -> str:
    """Load Yandex token from .env file."""
    if not ENV_FILE.exists():
        raise FileNotFoundError(f".env file not found: {ENV_FILE}")

    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line.startswith("YANDEX_API_SDK_OAUTH_TOKEN="):
                return line.split("=", 1)[1].strip('"')

    raise ValueError("YANDEX_API_SDK_OAUTH_TOKEN not found in .env file")


@click.command(name="yadisk-upload")
@click.option(
    "--token",
    default=None,
    help="Yandex OAuth token (default: load from .env file)",
)
@click.option("--file", "file_path", required=True, help="Local file path")
@click.option("--remote", required=True, help="Remote path on Yandex Disk")
@click.option("--overwrite", is_flag=True, help="Overwrite existing file")
def upload_file(
    token: str | None,
    file_path: str,
    remote: str,
    overwrite: bool,
) -> None:
    """Upload a file to Yandex Disk."""
    if token is None:
        token = load_env_token()

    client = yadisk.Client(token=token)
    local_path = Path(file_path)

    if not local_path.exists():
        raise click.ClickException(f"File not found: {local_path}")

    with client:
        # Delete existing file if it exists
        if client.exists(remote) and overwrite:
            click.echo(f"Deleting existing file: {remote}")
            client.remove(remote)
        
        client.upload(str(local_path), remote)
        click.echo(f"Uploaded: {local_path} -> {remote}")


if __name__ == "__main__":
    upload_file()
