from typing import Generator
import pytest
from fastapi.testclient import TestClient

from backend.app.core.execution.pools import execution_pool_manager
from backend.app.main import app


@pytest.fixture(scope="session", autouse=True)
def manage_pool() -> Generator[None, None, None]:
    """Ensures worker pool is started for tests and cleaned up after session."""
    execution_pool_manager.start()
    yield
    execution_pool_manager.shutdown()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """TestClient fixture with app context."""
    with TestClient(app) as test_client:
        yield test_client

