from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.event import async_track_time_interval

from .const import DEFAULT_PEOPLE, DEFAULT_TODO_ENTITY, DOMAIN, SYNC_MINUTES
from .manager import MealVoteManager


def _people(entry: ConfigEntry) -> list[str]:
    raw = entry.options.get("people", entry.data.get("people", DEFAULT_PEOPLE))
    return [x.strip() for x in raw.split(",") if x.strip()]



def _todo_entity(entry: ConfigEntry) -> str:
    return entry.options.get("todo_entity", entry.data.get("todo_entity", DEFAULT_TODO_ENTITY)).strip() or DEFAULT_TODO_ENTITY


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

    for command in (ws_get_data, ws_add_dish, ws_update_dish, ws_delete_dish, ws_upload_image, ws_add_to_shopping_list, ws_set_pantry, ws_set_week_plan, ws_add_week_to_shopping_list):
        websocket_api.async_register_command(hass, command)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    manager = MealVoteManager(hass, entry.data["data_path"], _people(entry), _todo_entity(entry))
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
