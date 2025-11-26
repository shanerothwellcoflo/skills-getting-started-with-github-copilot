from fastapi.testclient import TestClient
from urllib.parse import quote
from copy import deepcopy
import importlib.util
import pathlib
import sys
import pytest


# Load the application module directly from src/app.py so tests work
ROOT = pathlib.Path(__file__).resolve().parents[1]
APP_PATH = ROOT / "src" / "app.py"
spec = importlib.util.spec_from_file_location("app_module", str(APP_PATH))
app_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = app_module
spec.loader.exec_module(app_module)

client = TestClient(app_module.app)


# Capture a snapshot of the initial in-memory activities so tests can reset state
INITIAL_ACTIVITIES = deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Restore the in-memory activities before each test
    app_module.activities.clear()
    app_module.activities.update(deepcopy(INITIAL_ACTIVITIES))
    yield


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert "Chess Club" in data


def test_signup_success_and_reflected_in_get():
    email = "tester+1@mergington.edu"
    activity = "Chess Club"

    r = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert r.status_code == 200
    body = r.json()
    assert "Signed up" in body.get("message", "")

    # Now GET activities and ensure the participant appears
    r2 = client.get("/activities")
    data = r2.json()
    assert email in data[activity]["participants"]


def test_signup_already_registered_returns_400():
    # Pick an existing participant from initial data
    activity = "Chess Club"
    existing = INITIAL_ACTIVITIES[activity]["participants"][0]

    r = client.post(f"/activities/{quote(activity)}/signup?email={quote(existing)}")
    assert r.status_code == 400


def test_signup_nonexistent_activity_returns_404():
    r = client.post(f"/activities/{quote('NoSuch')}/signup?email={quote('x@y.com')}")
    assert r.status_code == 404


def test_unregister_success_and_reflected_in_get():
    activity = "Programming Class"
    participant = INITIAL_ACTIVITIES[activity]["participants"][0]

    r = client.delete(f"/activities/{quote(activity)}/participants?email={quote(participant)}")
    assert r.status_code == 200
    body = r.json()
    assert "Unregistered" in body.get("message", "")

    r2 = client.get("/activities")
    data = r2.json()
    assert participant not in data[activity]["participants"]


def test_unregister_nonexistent_participant_returns_404():
    activity = "Chess Club"
    r = client.delete(f"/activities/{quote(activity)}/participants?email={quote('noone@x.com')}")
    assert r.status_code == 404
