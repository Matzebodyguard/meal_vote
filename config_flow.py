from __future__ import annotations

import os
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import DEFAULT_DATA_PATH, DEFAULT_PEOPLE, DEFAULT_TODO_ENTITY, DOMAIN


class MealVoteConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            path = user_input["data_path"].strip()
            if not await self.hass.async_add_executor_job(os.path.isdir, path):
                errors["base"] = "path_not_found"
            else:
                await self.async_set_unique_id("meal_vote")
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title="Essenswahl", data=user_input)

        schema = vol.Schema({
            vol.Required("data_path", default=DEFAULT_DATA_PATH): str,
            vol.Required("people", default=DEFAULT_PEOPLE): str,
            vol.Required("todo_entity", default=DEFAULT_TODO_ENTITY): str,
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return MealVoteOptionsFlow(config_entry)


class MealVoteOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        schema = vol.Schema({
            vol.Required(
                "people",
                default=self.config_entry.options.get("people", self.config_entry.data.get("people", DEFAULT_PEOPLE)),
            ): str,
            vol.Required(
                "todo_entity",
                default=self.config_entry.options.get("todo_entity", self.config_entry.data.get("todo_entity", DEFAULT_TODO_ENTITY)),
            ): str,
        })
        return self.async_show_form(step_id="init", data_schema=schema)
