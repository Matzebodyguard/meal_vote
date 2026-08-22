from __future__ import annotations

import base64
import csv
import os
import re
from decimal import Decimal, InvalidOperation
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import CSV_NAME, IMAGE_CACHE_DIR, INGREDIENTS_CSV_NAME, MAX_IMAGE_BYTES, STORE_KEY, STORE_VERSION, SYNC_MINUTES

_SAFE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class MealVoteManager:
    def __init__(self, hass: HomeAssistant, data_path: str, people: list[str], todo_entity: str):
        self.hass = hass
        self.data_path = Path(data_path)
        self.csv_path = self.data_path / CSV_NAME
        self.ingredients_csv_path = self.data_path / INGREDIENTS_CSV_NAME
        self.people = people
        self.todo_entity = todo_entity
        self.dishes: dict[str, dict] = {}
        self.store = Store(hass, STORE_VERSION, STORE_KEY)
        self.state = {"votes": {}, "history": {}, "cached_dishes": [], "pantry": []}
        self.cache_dir = Path(hass.config.path("www", IMAGE_CACHE_DIR))
        self.last_sync_ok: str | None = None
        self.last_sync_error: str | None = None

    async def async_initialize(self):
        stored = await self.store.async_load()
        if stored:
            self.state.update(stored)
        cached = self.state.get("cached_dishes", [])
        self.dishes = {d["id"]: d for d in cached if d.get("id") and d.get("name")}
        try:
            await self.async_reload()
        except (OSError, FileNotFoundError) as err:
            self.last_sync_error = str(err)

    async def async_reload(self):
        try:
            dishes = await self.hass.async_add_executor_job(self._read_csv)
            ingredients = await self.hass.async_add_executor_job(self._read_ingredients_csv)
            for dish in dishes:
                dish["ingredients"] = ingredients.get(dish["id"], [])
            self.dishes = {d["id"]: d for d in dishes}
            await self.hass.async_add_executor_job(self._sync_images)
            self.state["cached_dishes"] = list(self.dishes.values())
            self.last_sync_ok = datetime.now().astimezone().isoformat(timespec="seconds")
            self.last_sync_error = None
            await self._save()
        except (OSError, FileNotFoundError) as err:
            self.last_sync_error = str(err)
            raise

    def _read_csv(self):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        if not self.csv_path.is_file():
            raise FileNotFoundError(f"CSV nicht gefunden: {self.csv_path}")
        result = []
        with self.csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                dish_id = (row.get("id") or "").strip()
                name = (row.get("name") or "").strip()
                if not dish_id or not name:
                    continue
                result.append({
                    "id": dish_id,
                    "name": name,
                    "category": (row.get("category") or "").strip(),
                    "image": (row.get("image") or "").strip(),
                    "active": (row.get("active") or "true").strip().lower() not in {"0", "false", "no", "nein"},
                })
        return result

    def _read_ingredients_csv(self):
        result: dict[str, list[dict]] = {}
        if not self.ingredients_csv_path.is_file():
            return result
        with self.ingredients_csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                dish_id = (row.get("dish_id") or "").strip()
                name = (row.get("name") or "").strip()
                if not dish_id or not name:
                    continue
                result.setdefault(dish_id, []).append({
                    "name": name,
                    "amount": (row.get("amount") or "").strip(),
                    "unit": (row.get("unit") or "").strip(),
                })
        return result

    def _write_csv(self, dishes):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        tmp = self.csv_path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "name", "category", "image", "active"])
            writer.writeheader()
            for d in dishes:
                writer.writerow({
                    "id": d["id"], "name": d["name"], "category": d.get("category", ""),
                    "image": d.get("image", ""), "active": "true" if d.get("active", True) else "false"
                })
        os.replace(tmp, self.csv_path)

    def _write_ingredients_csv(self, dishes):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        tmp = self.ingredients_csv_path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["dish_id", "name", "amount", "unit"])
            writer.writeheader()
            for d in dishes:
                for item in d.get("ingredients", []):
                    name = str(item.get("name", "")).strip()
                    if not name:
                        continue
                    writer.writerow({
                        "dish_id": d["id"], "name": name,
                        "amount": str(item.get("amount", "")).strip(),
                        "unit": str(item.get("unit", "")).strip(),
                    })
        os.replace(tmp, self.ingredients_csv_path)

    def _sync_images(self):
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        for dish in self.dishes.values():
            rel = dish.get("image")
            if not rel:
                dish.pop("image_url", None)
                continue
            src = (self.data_path / rel).resolve()
            if self.data_path.resolve() not in src.parents or not src.is_file():
                continue
            ext = src.suffix.lower() if src.suffix.lower() in _SAFE_EXTENSIONS else ".jpg"
            target = self.cache_dir / f"{dish['id']}{ext}"
            try:
                if not target.exists() or src.stat().st_mtime > target.stat().st_mtime:
                    shutil.copy2(src, target)
                dish["image_url"] = f"/local/{IMAGE_CACHE_DIR}/{target.name}"
            except OSError:
                pass

    async def async_vote(self, dish_id: str, person: str):
        self._validate(dish_id, person)
        voters = set(self.state["votes"].get(dish_id, []))
        if person in voters:
            voters.remove(person)
        else:
            voters.add(person)
        self.state["votes"][dish_id] = sorted(voters)
        await self._save()

    async def async_mark_cooked(self, dish_id: str):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        self.state["votes"].pop(dish_id, None)
        history = self.state["history"].setdefault(dish_id, {"times_cooked": 0, "last_cooked": None, "cooked_dates": []})
        now = datetime.now().astimezone().isoformat(timespec="seconds")
        dates = history.setdefault("cooked_dates", [])
        dates.append(now)
        history["cooked_dates"] = dates[-100:]
        history["times_cooked"] = int(history.get("times_cooked", 0)) + 1
        history["last_cooked"] = now
        await self._save()

    async def async_add_dish(self, name: str, category: str = "", image: str = "", ingredients: list[dict] | None = None):
        dish_id = uuid.uuid4().hex[:12]
        dish = {"id": dish_id, "name": name.strip(), "category": category.strip(), "image": image.strip(), "active": True, "ingredients": self._clean_ingredients(ingredients or [])}
        if not dish["name"]:
            raise ValueError("Name darf nicht leer sein")
        dishes = [dict(d) for d in self.dishes.values()] + [dish]
        await self.hass.async_add_executor_job(self._write_csv, dishes)
        await self.hass.async_add_executor_job(self._write_ingredients_csv, dishes)
        await self.async_reload()
        return dish_id

    async def async_update_dish(self, dish_id: str, name: str, category: str = "", image: str = "", active: bool = True, ingredients: list[dict] | None = None):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        if not name.strip():
            raise ValueError("Name darf nicht leer sein")
        dishes = [dict(d) for d in self.dishes.values()]
        for d in dishes:
            if d["id"] == dish_id:
                d.update(name=name.strip(), category=category.strip(), image=image.strip(), active=bool(active))
                if ingredients is not None:
                    d["ingredients"] = self._clean_ingredients(ingredients)
                d.pop("image_url", None)
                break
        await self.hass.async_add_executor_job(self._write_csv, dishes)
        await self.hass.async_add_executor_job(self._write_ingredients_csv, dishes)
        await self.async_reload()

    async def async_delete_dish(self, dish_id: str):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        dishes = [d for d in self.dishes.values() if d["id"] != dish_id]
        await self.hass.async_add_executor_job(self._write_csv, dishes)
        await self.hass.async_add_executor_job(self._write_ingredients_csv, dishes)
        self.state["votes"].pop(dish_id, None)
        self.state["history"].pop(dish_id, None)
        await self.async_reload()

    @staticmethod
    def _normalize_food_name(value: str) -> str:
        """Normalize ingredient names for duplicate detection."""
        value = re.sub(r"[^\wäöüÄÖÜß]+", " ", (value or "").strip(), flags=re.UNICODE)
        return re.sub(r"\s+", " ", value).strip().casefold()

    @classmethod
    def _food_keys_match(cls, left: str, right: str) -> bool:
        """Match common singular/plural spellings without being overly fuzzy."""
        left = cls._normalize_food_name(left)
        right = cls._normalize_food_name(right)
        if not left or not right:
            return False
        if left == right:
            return True

        def variants(value: str) -> set[str]:
            out = {value}
            words = value.split()
            if not words:
                return out
            last = words[-1]
            stems = {last}
            for suffix in ("en", "n", "e", "s"):
                if len(last) > len(suffix) + 2 and last.endswith(suffix):
                    stems.add(last[:-len(suffix)])
            for stem in stems:
                out.add(" ".join([*words[:-1], stem]))
            return out

        return bool(variants(left) & variants(right))

    @staticmethod
    def _normalize_unit(value: str) -> str:
        """Normalize common units while keeping unknown units distinct."""
        unit = re.sub(r"[.]", "", (value or "").strip()).casefold()
        aliases = {
            "gramm": "g", "gram": "g", "g": "g",
            "kilogramm": "kg", "kilogram": "kg", "kg": "kg",
            "milliliter": "ml", "millilitre": "ml", "ml": "ml",
            "liter": "l", "litre": "l", "l": "l",
            "stück": "stück", "stueck": "stück", "stk": "stück", "st": "stück",
            "dose": "dose", "dosen": "dose",
            "packung": "packung", "packungen": "packung", "pkg": "packung",
            "el": "el", "esslöffel": "el", "essloeffel": "el",
            "tl": "tl", "teelöffel": "tl", "teeloeffel": "tl",
        }
        return aliases.get(unit, unit)

    @staticmethod
    def _decimal(value: str):
        try:
            return Decimal((value or "").strip().replace(",", "."))
        except (InvalidOperation, AttributeError):
            return None

    @staticmethod
    def _format_amount(value: Decimal) -> str:
        text = format(value.normalize(), "f")
        if "." in text:
            text = text.rstrip("0").rstrip(".")
        return text.replace(".", ",")

    @classmethod
    def _merge_quantities(cls, old_amount, old_unit: str, new_amount, new_unit: str):
        """Return (amount, unit) when quantities can safely be combined."""
        if old_amount is None or new_amount is None:
            return None
        old_unit = cls._normalize_unit(old_unit)
        new_unit = cls._normalize_unit(new_unit)
        # A manually entered count such as "2 Zwiebeln" is equivalent to
        # the recipe unit "Stück" for merge purposes.
        if {old_unit, new_unit} <= {"", "stück"}:
            return old_amount + new_amount, "stück" if "stück" in {old_unit, new_unit} else ""
        if old_unit == new_unit:
            return old_amount + new_amount, old_unit
        weight = {"g": Decimal("1"), "kg": Decimal("1000")}
        volume = {"ml": Decimal("1"), "l": Decimal("1000")}
        for conversion, base_unit in ((weight, "g"), (volume, "ml")):
            if old_unit in conversion and new_unit in conversion:
                total = old_amount * conversion[old_unit] + new_amount * conversion[new_unit]
                return total, base_unit
        return None

    async def _async_open_todo_items(self):
        if not self.hass.services.has_service("todo", "get_items"):
            raise ValueError("Der Home-Assistant-Dienst 'todo.get_items' ist nicht verfügbar")
        response = await self.hass.services.async_call(
            "todo",
            "get_items",
            {"status": "needs_action"},
            target={"entity_id": self.todo_entity},
            blocking=True,
            return_response=True,
        )
        entity_data = (response or {}).get(self.todo_entity, {})
        if not isinstance(entity_data, dict):
            return []
        items = entity_data.get("items", [])
        return items if isinstance(items, list) else []

    @classmethod
    def _parse_shopping_summary(cls, summary: str):
        """Parse shopping entries created here and common manually entered forms."""
        summary = re.sub(r"\s+", " ", (summary or "").strip())
        # amount + unit + ingredient, e.g. 500 g Hackfleisch
        match = re.match(r"^(\d+(?:[.,]\d+)?)\s+([^\s]+)\s+(.+)$", summary)
        if match:
            return {
                "amount": cls._decimal(match.group(1)),
                "unit": cls._normalize_unit(match.group(2)),
                "name": match.group(3).strip(),
            }
        # amount + ingredient without unit, e.g. 2 Zwiebeln
        match = re.match(r"^(\d+(?:[.,]\d+)?)\s+(.+)$", summary)
        if match:
            return {
                "amount": cls._decimal(match.group(1)),
                "unit": "",
                "name": match.group(2).strip(),
            }
        return {"amount": None, "unit": "", "name": summary}

    async def async_add_to_shopping_list(self, dish_id: str, ingredient_indices: list[int] | None = None):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        all_ingredients = self.dishes[dish_id].get("ingredients", [])
        ingredients = all_ingredients
        if ingredient_indices is not None:
            valid_indices = []
            for raw_index in ingredient_indices:
                try:
                    idx = int(raw_index)
                except (TypeError, ValueError):
                    continue
                if 0 <= idx < len(all_ingredients):
                    valid_indices.append(idx)
            ingredients = [all_ingredients[i] for i in valid_indices]
        if not ingredients:
            raise ValueError("Bitte mindestens eine Zutat auswählen")
        if not self.hass.services.has_service("todo", "add_item"):
            raise ValueError("Der Home-Assistant-Dienst 'todo.add_item' ist nicht verfügbar")
        if self.hass.states.get(self.todo_entity) is None:
            raise ValueError(f"Die To-do-Liste '{self.todo_entity}' wurde nicht gefunden")

        open_items = await self._async_open_todo_items()
        existing = []
        for todo_item in open_items:
            summary = str(todo_item.get("summary", "") or "").strip()
            parsed = self._parse_shopping_summary(summary)
            parsed["uid"] = todo_item.get("uid")
            parsed["summary"] = summary
            parsed["key"] = self._normalize_food_name(parsed["name"])
            existing.append(parsed)

        added = updated = already_present = 0
        for ingredient in ingredients:
            name = str(ingredient.get("name") or "").strip()
            if not name:
                continue
            amount_text = str(ingredient.get("amount") or "").strip()
            raw_unit = str(ingredient.get("unit") or "").strip()
            unit = self._normalize_unit(raw_unit)
            amount = self._decimal(amount_text)
            key = self._normalize_food_name(name)
            match = next((item for item in existing if self._food_keys_match(item.get("name", ""), name)), None)

            if match is not None:
                merged = self._merge_quantities(match.get("amount"), match.get("unit", ""), amount, unit)
                if merged and self.hass.services.has_service("todo", "update_item"):
                    total, result_unit = merged
                    quantity = self._format_amount(total)
                    rename = " ".join(x for x in [quantity, result_unit, name] if x).strip()
                    await self.hass.services.async_call(
                        "todo",
                        "update_item",
                        {"item": match.get("uid") or match["summary"], "rename": rename},
                        target={"entity_id": self.todo_entity},
                        blocking=True,
                    )
                    match.update(amount=total, unit=result_unit, name=name, summary=rename, key=key)
                    updated += 1
                    continue
                already_present += 1
                continue

            text = " ".join(x for x in [amount_text, raw_unit, name] if x).strip()
            await self.hass.services.async_call(
                "todo",
                "add_item",
                {"item": text},
                target={"entity_id": self.todo_entity},
                blocking=True,
            )
            existing.append({"key": key, "amount": amount, "unit": unit, "name": name, "summary": text, "uid": None})
            added += 1

        return {"count": len(ingredients), "added": added, "updated": updated, "already_present": already_present, "existing_count": len(open_items), "todo_entity": self.todo_entity}


    async def async_set_pantry(self, ingredients: list[str]):
        cleaned = []
        seen = set()
        for item in ingredients:
            name = str(item or "").strip()
            key = self._normalize_ingredient_name(name)
            if name and key and key not in seen:
                cleaned.append(name)
                seen.add(key)
        self.state["pantry"] = cleaned
        await self._save()

    @staticmethod
    def _normalize_ingredient_name(value: str) -> str:
        text = str(value or "").strip().lower()
        text = re.sub(r"\s+", " ", text)
        if len(text) > 5:
            for ending in ("ern", "en", "er", "es", "e", "n", "s"):
                if text.endswith(ending):
                    text = text[:-len(ending)]
                    break
        return text

    async def async_upload_image(self, dish_id: str, filename: str, data_url: str) -> str:
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        match = re.match(r"^data:image/(jpeg|png|webp);base64,(.+)$", data_url, re.DOTALL)
        if not match:
            raise ValueError("Nur JPEG-, PNG- oder WebP-Bilder werden unterstützt")
        raw = base64.b64decode(match.group(2), validate=True)
        if len(raw) > MAX_IMAGE_BYTES:
            raise ValueError("Bild ist größer als 8 MB")
        ext = {"jpeg": ".jpg", "png": ".png", "webp": ".webp"}[match.group(1)]
        safe_base = re.sub(r"[^a-zA-Z0-9_-]+", "_", Path(filename).stem).strip("_") or dish_id
        rel = f"images/{dish_id}_{safe_base[:40]}{ext}"
        target = self.data_path / rel
        await self.hass.async_add_executor_job(self._write_image, target, raw)
        d = self.dishes[dish_id]
        await self.async_update_dish(dish_id, d["name"], d.get("category", ""), rel, d.get("active", True), d.get("ingredients", []))
        return rel

    def _write_image(self, target: Path, raw: bytes):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)

    def _clean_ingredients(self, ingredients):
        clean = []
        for item in ingredients or []:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            clean.append({"name": name, "amount": str(item.get("amount", "")).strip(), "unit": str(item.get("unit", "")).strip()})
        return clean

    def _validate(self, dish_id, person):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        if person not in self.people:
            raise ValueError("Unbekannte Person")

    async def _save(self):
        await self.store.async_save(self.state)

    def export(self):
        out = []
        for d in self.dishes.values():
            hist = self.state["history"].get(d["id"], {})
            voters = self.state["votes"].get(d["id"], [])
            out.append({
                **d,
                "voters": voters,
                "vote_count": len(voters),
                "last_cooked": hist.get("last_cooked"),
                "times_cooked": hist.get("times_cooked", 0),
                "cooked_dates": hist.get("cooked_dates", []),
            })
        return {
            "people": self.people,
            "dishes": out,
            "sync": {"last_ok": self.last_sync_ok, "error": self.last_sync_error, "interval_minutes": SYNC_MINUTES},
            "todo_entity": self.todo_entity,
            "pantry": self.state.get("pantry", []),
        }
