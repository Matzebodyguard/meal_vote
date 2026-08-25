from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import shutil
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.event import async_track_time_interval

from .const import DEFAULT_PEOPLE, DEFAULT_STORAGE_MODE, DEFAULT_TODO_ENTITY, DOMAIN, LOCAL_DATA_DIR, SYNC_MINUTES
from .manager import MealVoteManager


def _people(entry: ConfigEntry) -> list[str]:
    raw = entry.options.get("people", entry.data.get("people", DEFAULT_PEOPLE))
    return [x.strip() for x in raw.split(",") if x.strip()]



def _todo_entity(entry: ConfigEntry) -> str:
    return entry.options.get("todo_entity", entry.data.get("todo_entity", DEFAULT_TODO_ENTITY)).strip() or DEFAULT_TODO_ENTITY


def _storage_mode(entry: ConfigEntry) -> str:
    # Existing pre-v0.6.19 entries with a data_path remain network-backed.
    return entry.options.get(
        "storage_mode",
        entry.data.get("storage_mode", "network" if entry.data.get("data_path") else DEFAULT_STORAGE_MODE),
    )


def _data_path(hass: HomeAssistant, entry: ConfigEntry) -> str:
    if _storage_mode(entry) == "local":
        return hass.config.path(LOCAL_DATA_DIR)
    return entry.options.get("data_path", entry.data.get("data_path", "")).strip()


def _ensure_local_storage(path: str) -> None:
    data_dir = Path(path)
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "images").mkdir(parents=True, exist_ok=True)

    dishes = data_dir / "dishes.csv"
    if not dishes.exists():
        dishes.write_text("id,name,category,categories,image,active\n", encoding="utf-8")

    ingredients = data_dir / "ingredients.csv"
    if not ingredients.exists():
        ingredients.write_text("dish_id,name,amount,unit\n", encoding="utf-8")

    recipes = data_dir / "recipes.csv"
    if not recipes.exists():
        recipes.write_text("dish_id,recipe\n", encoding="utf-8")


def _migrate_storage(source: str, target: str) -> dict:
    """Copy Meal Vote data between local and network storage without deleting source."""
    src = Path(source)
    dst = Path(target)
    if src.resolve() == dst.resolve():
        return {"copied": 0, "skipped": 0}

    if not src.is_dir():
        raise FileNotFoundError(f"Quellordner nicht erreichbar: {src}")

    dst.mkdir(parents=True, exist_ok=True)
    copied = 0
    skipped = 0

    # Copy all Meal Vote CSV files and the image directory. Existing destination
    # files are backed up before replacement so a migration is reversible.
    for name in ("dishes.csv", "ingredients.csv", "recipes.csv"):
        source_file = src / name
        if not source_file.exists():
            skipped += 1
            continue
        target_file = dst / name
        if target_file.exists() and target_file.stat().st_size:
            backup = dst / f"{name}.before_migration"
            shutil.copy2(target_file, backup)
        shutil.copy2(source_file, target_file)
        copied += 1

    source_images = src / "images"
    target_images = dst / "images"
    target_images.mkdir(parents=True, exist_ok=True)
    if source_images.is_dir():
        for item in source_images.rglob("*"):
            if not item.is_file():
                continue
            rel = item.relative_to(source_images)
            dest = target_images / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest)
            copied += 1

    return {"copied": copied, "skipped": skipped}


def _manager(hass: HomeAssistant) -> MealVoteManager:
    managers = list(hass.data.get(DOMAIN, {}).values())
    if not managers:
        raise ValueError("Essenswahl ist nicht geladen")
    # Internal dict may also contain bookkeeping keys later; select manager only.
    for item in managers:
        if isinstance(item, MealVoteManager):
            return item
    raise ValueError("Essenswahl ist nicht geladen")


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    hass.data.setdefault(DOMAIN, {})

    # The Lovelace card is bundled with the integration so HACS updates both
    # backend and frontend together. The resource URL only needs to be added once.
    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig("/meal_vote_static", str(frontend_dir), False)]
    )

    for command in (ws_get_data, ws_add_dish, ws_update_dish, ws_delete_dish, ws_upload_image, ws_add_to_shopping_list, ws_set_pantry, ws_set_week_plan, ws_add_week_to_shopping_list, ws_optimize_images):
        websocket_api.async_register_command(hass, command)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    data_path = _data_path(hass, entry)
    if _storage_mode(entry) == "local":
        await hass.async_add_executor_job(_ensure_local_storage, data_path)
    manager = MealVoteManager(hass, data_path, _people(entry), _todo_entity(entry))
    await manager.async_initialize()
    hass.data[DOMAIN][entry.entry_id] = manager

    async def vote(call: ServiceCall):
        await manager.async_vote(call.data["dish_id"], call.data["person"])

    async def cooked(call: ServiceCall):
        await manager.async_mark_cooked(call.data["dish_id"])

    async def reload_data(call: ServiceCall):
        await manager.async_reload()

    async def add_dish(call: ServiceCall):
        await manager.async_add_dish(call.data["name"], call.data.get("category", ""), call.data.get("image", ""))

    hass.services.async_register(DOMAIN, "vote", vote, schema=vol.Schema({vol.Required("dish_id"): str, vol.Required("person"): str}))
    hass.services.async_register(DOMAIN, "mark_cooked", cooked, schema=vol.Schema({vol.Required("dish_id"): str}))
    hass.services.async_register(DOMAIN, "reload", reload_data)
    hass.services.async_register(DOMAIN, "add_dish", add_dish, schema=vol.Schema({vol.Required("name"): str, vol.Optional("category", default=""): str, vol.Optional("image", default=""): str}))

    async def scheduled_reload(_now):
        try:
            await manager.async_reload()
        except (OSError, FileNotFoundError):
            pass

    entry.async_on_unload(async_track_time_interval(hass, scheduled_reload, timedelta(minutes=SYNC_MINUTES)))
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    manager = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if isinstance(manager, MealVoteManager):
        old_path = str(manager.data_path)
        new_path = _data_path(hass, entry)
        if old_path and new_path and Path(old_path) != Path(new_path):
            if _storage_mode(entry) == "local":
                await hass.async_add_executor_job(_ensure_local_storage, new_path)
            await hass.async_add_executor_job(_migrate_storage, old_path, new_path)
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True


@websocket_api.websocket_command({vol.Required("type"): "meal_vote/get_data"})
@websocket_api.async_response
async def ws_get_data(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    try:
        connection.send_result(msg["id"], _manager(hass).export())
    except ValueError as err:
        connection.send_error(msg["id"], "not_loaded", str(err))


@websocket_api.websocket_command({vol.Required("type"): "meal_vote/add_dish", vol.Required("name"): str, vol.Optional("category", default=""): str, vol.Optional("categories", default=[]): list, vol.Optional("recipe", default=""): str, vol.Optional("image", default=""): str, vol.Optional("ingredients", default=[]): list})
@websocket_api.async_response
async def ws_add_dish(hass, connection, msg):
    try:
        dish_id = await _manager(hass).async_add_dish(msg["name"], msg.get("category", ""), msg.get("image", ""), msg.get("ingredients", []), msg.get("categories", []), msg.get("recipe", ""))
        connection.send_result(msg["id"], {"dish_id": dish_id})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "save_failed", str(err))


@websocket_api.websocket_command({vol.Required("type"): "meal_vote/update_dish", vol.Required("dish_id"): str, vol.Required("name"): str, vol.Optional("category", default=""): str, vol.Optional("categories", default=[]): list, vol.Optional("recipe", default=""): str, vol.Optional("image", default=""): str, vol.Optional("active", default=True): bool, vol.Optional("ingredients", default=[]): list})
@websocket_api.async_response
async def ws_update_dish(hass, connection, msg):
    try:
        await _manager(hass).async_update_dish(msg["dish_id"], msg["name"], msg.get("category", ""), msg.get("image", ""), msg.get("active", True), msg.get("ingredients", []), msg.get("categories", []), msg.get("recipe", ""))
        connection.send_result(msg["id"], {"ok": True})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "save_failed", str(err))


@websocket_api.websocket_command({vol.Required("type"): "meal_vote/delete_dish", vol.Required("dish_id"): str})
@websocket_api.async_response
async def ws_delete_dish(hass, connection, msg):
    try:
        await _manager(hass).async_delete_dish(msg["dish_id"])
        connection.send_result(msg["id"], {"ok": True})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "delete_failed", str(err))


@websocket_api.websocket_command({vol.Required("type"): "meal_vote/upload_image", vol.Required("dish_id"): str, vol.Required("filename"): str, vol.Required("data_url"): str})
@websocket_api.async_response
async def ws_upload_image(hass, connection, msg):
    try:
        rel = await _manager(hass).async_upload_image(msg["dish_id"], msg["filename"], msg["data_url"])
        connection.send_result(msg["id"], {"image": rel})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "upload_failed", str(err))


@websocket_api.websocket_command({
    vol.Required("type"): "meal_vote/add_to_shopping_list",
    vol.Required("dish_id"): str,
    vol.Optional("ingredient_indices"): [vol.Coerce(int)],
})
@websocket_api.async_response
async def ws_add_to_shopping_list(hass, connection, msg):
    try:
        result = await _manager(hass).async_add_to_shopping_list(msg["dish_id"], msg.get("ingredient_indices"))
        connection.send_result(msg["id"], {"ok": True, **result})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "shopping_list_failed", str(err))


@websocket_api.websocket_command({
    vol.Required("type"): "meal_vote/set_pantry",
    vol.Required("ingredients"): [str],
})
@websocket_api.async_response
async def ws_set_pantry(hass, connection, msg):
    try:
        await _manager(hass).async_set_pantry(msg["ingredients"])
        connection.send_result(msg["id"], {"ok": True})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "pantry_failed", str(err))


@websocket_api.websocket_command({
    vol.Required("type"): "meal_vote/set_week_plan",
    vol.Required("plan"): dict,
})
@websocket_api.async_response
async def ws_set_week_plan(hass, connection, msg):
    try:
        await _manager(hass).async_set_week_plan(msg["plan"])
        connection.send_result(msg["id"], {"ok": True})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "week_plan_failed", str(err))


@websocket_api.websocket_command({
    vol.Required("type"): "meal_vote/add_week_to_shopping_list",
    vol.Required("ingredient_refs"): list,
})
@websocket_api.async_response
async def ws_add_week_to_shopping_list(hass, connection, msg):
    try:
        result = await _manager(hass).async_add_week_to_shopping_list(msg["ingredient_refs"])
        connection.send_result(msg["id"], {"ok": True, **result})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "week_shopping_failed", str(err))


@websocket_api.websocket_command({
    vol.Required("type"): "meal_vote/optimize_images",
})
@websocket_api.async_response
async def ws_optimize_images(hass, connection, msg):
    try:
        result = await _manager(hass).async_optimize_existing_images()
        connection.send_result(msg["id"], {"ok": True, **result})
    except (ValueError, OSError) as err:
        connection.send_error(msg["id"], "image_optimize_failed", str(err))
