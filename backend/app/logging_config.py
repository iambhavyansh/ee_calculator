import logging
import sys


def setup_logging() -> None:
    """Configures human-readable console logging."""
    log_format = "%(asctime)s %(levelname)s %(name)s %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )

