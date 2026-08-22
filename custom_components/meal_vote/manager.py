from __future__ import annotations

import base64
import csv
import os
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import CSV_NAME, IMAGE_CACHE_DIR, MAX_IMAGE_BYTES, STORE_KEY, STORE_VERSION

_SAFE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class MealVoteManager:
    def __init__(self, hass: HomeAssistant, data_path: str, people: list[str]):
        self.hass = hass
        self.data_path = Path(data_path)
        self.csv_path = self.data_path / CSV_NAME
        self.people = people
        self.dishes: dict[str, dict] = {}
        self.store = Store(hass, STORE_VERSION, STORE_KEY)
        self.state = {"votes": {}, "history": {}, "cached_dishes": []}
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

    def _write_csv(self, dishes):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        self.data_path.mkdir(parents=True, exist_ok=True)
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
        history = self.state["history"].setdefault(dish_id, {"times_cooked": 0, "last_cooked": None})
        history["times_cooked"] = int(history.get("times_cooked", 0)) + 1
        history["last_cooked"] = datetime.now().astimezone().isoformat(timespec="seconds")
        await self._save()

    async def async_add_dish(self, name: str, category: str = "", image: str = ""):
        dish_id = uuid.uuid4().hex[:12]
        dish = {"id": dish_id, "name": name.strip(), "category": category.strip(), "image": image.strip(), "active": True}
        if not dish["name"]:
            raise ValueError("Name darf nicht leer sein")
        await self.hass.async_add_executor_job(self._write_csv, list(self.dishes.values()) + [dish])
        await self.async_reload()
        return dish_id

    async def async_update_dish(self, dish_id: str, name: str, category: str = "", image: str = "", active: bool = True):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        if not name.strip():
            raise ValueError("Name darf nicht leer sein")
        dishes = [dict(d) for d in self.dishes.values()]
        for d in dishes:
            if d["id"] == dish_id:
                d.update(name=name.strip(), category=category.strip(), image=image.strip(), active=bool(active))
                d.pop("image_url", None)
                break
        await self.hass.async_add_executor_job(self._write_csv, dishes)
        await self.async_reload()

    async def async_delete_dish(self, dish_id: str):
        if dish_id not in self.dishes:
            raise ValueError("Unbekanntes Gericht")
        dishes = [d for d in self.dishes.values() if d["id"] != dish_id]
        await self.hass.async_add_executor_job(self._write_csv, dishes)
        self.state["votes"].pop(dish_id, None)
        self.state["history"].pop(dish_id, None)
        await self.async_reload()

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
        await self.async_update_dish(dish_id, d["name"], d.get("category", ""), rel, d.get("active", True))
        return rel

    def _write_image(self, target: Path, raw: bytes):
        if not self.data_path.is_dir():
            raise FileNotFoundError(f"Datenordner nicht erreichbar: {self.data_path}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)

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
            out.append({**d, "voters": voters, "vote_count": len(voters), "last_cooked": hist.get("last_cooked"), "times_cooked": hist.get("times_cooked", 0)})
        return {
            "people": self.people,
            "dishes": out,
            "sync": {"last_ok": self.last_sync_ok, "error": self.last_sync_error, "interval_minutes": 2},
        }
