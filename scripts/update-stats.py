#!/usr/bin/env python3
"""Refresh public GitHub activity data and cache the standard ghchart image.

Uses the Python standard library and unauthenticated public URLs only.
Fetch/validation failures leave the last successful files untouched.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.request import Request, urlopen
from xml.etree import ElementTree

USERNAME = "GrekF3"
CALENDAR_URL = f"https://github.com/users/{USERNAME}/contributions"
CHART_URL = f"https://ghchart.rshah.org/376748/{USERNAME}"
ASSETS = Path(__file__).resolve().parents[1] / "assets"


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cells = {}
        self.counts = {}
        self.heading = []
        self.in_heading = False
        self.tooltip_id = None
        self.tooltip_text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h2" and attrs.get("id") == "js-contribution-activity-description":
            self.in_heading = True
        if tag == "td" and attrs.get("data-date") and attrs.get("id"):
            self.cells[attrs["id"]] = (attrs["data-date"], int(attrs["data-level"]))
        if tag == "tool-tip" and attrs.get("for"):
            self.tooltip_id = attrs["for"]
            self.tooltip_text = []

    def handle_data(self, text):
        if self.in_heading:
            self.heading.append(text)
        if self.tooltip_id:
            self.tooltip_text.append(text)

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_heading = False
        if tag == "tool-tip" and self.tooltip_id:
            label = " ".join("".join(self.tooltip_text).split())
            match = re.match(r"(No|[\d,]+) contributions?\b", label)
            if match:
                self.counts[self.tooltip_id] = 0 if match[1] == "No" else int(match[1].replace(",", ""))
            self.tooltip_id = None

    def result(self):
        match = re.search(r"([\d,]+)\s+contributions?\b", " ".join(self.heading))
        if not match:
            raise ValueError("GitHub calendar total was not found")
        total = int(match[1].replace(",", ""))
        if set(self.cells) != set(self.counts):
            raise ValueError("GitHub calendar cells are incomplete")
        days = sorted(
            ({"date": stamp, "count": self.counts[cell_id], "level": level}
             for cell_id, (stamp, level) in self.cells.items()),
            key=lambda item: item["date"],
        )
        if not 350 <= len(days) <= 380:
            raise ValueError("Unexpected GitHub calendar length")
        stamps = [date.fromisoformat(item["date"]) for item in days]
        if any(b - a != timedelta(days=1) for a, b in zip(stamps, stamps[1:])):
            raise ValueError("GitHub calendar has duplicate or missing dates")
        if any(item["count"] < 0 or item["level"] not in range(5) for item in days):
            raise ValueError("Invalid GitHub calendar values")
        if sum(item["count"] for item in days) != total:
            raise ValueError("GitHub calendar does not match its displayed total")
        monthly = Counter()
        for item in days:
            monthly[item["date"][:7]] += item["count"]
        return {
            "schemaVersion": 1,
            "username": USERNAME,
            "source": CALENDAR_URL,
            "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "contributions": {
                "total": total,
                "activeDays": sum(item["count"] > 0 for item in days),
                "periodFrom": days[0]["date"],
                "periodTo": days[-1]["date"],
                "days": days,
            },
            "monthly": [{"month": month, "count": count} for month, count in sorted(monthly.items())],
            "chart": {"url": CHART_URL, "cachedFile": "assets/github-activity.svg"},
        }


def fetch(url, expected_type):
    request = Request(url, headers={
        "User-Agent": "GrekF3-public-portfolio-stats/1.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": expected_type,
    })
    with urlopen(request, timeout=30) as response:
        if expected_type not in response.headers.get("Content-Type", ""):
            raise ValueError("Unexpected response type from activity source")
        payload = response.read(2_000_001)
    if len(payload) > 2_000_000:
        raise ValueError("Activity response exceeded size limit")
    return payload


def validate_chart(svg):
    standard_doctype = b'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
    svg = svg.replace(standard_doctype, b"")
    if b"<!DOCTYPE" in svg.upper() or b"<!ENTITY" in svg.upper():
        raise ValueError("Unexpected SVG declaration")
    root = ElementTree.fromstring(svg)
    if root.tag.split("}")[-1] != "svg":
        raise ValueError("Activity chart is not SVG")
    dates = []
    for element in root.iter():
        if element.tag.split("}")[-1] in {"script", "foreignObject"}:
            raise ValueError("Unexpected active SVG element")
        if any(key.lower().startswith("on") for key in element.attrib):
            raise ValueError("Unexpected active SVG attribute")
        if "data-date" in element.attrib:
            dates.append(date.fromisoformat(element.attrib["data-date"]))
    if not 350 <= len(dates) <= 380 or len(set(dates)) != len(dates):
        raise ValueError("Activity chart calendar is incomplete")
    if date.today() - max(dates) > timedelta(days=2):
        raise ValueError("Activity chart cache is out of date")
    return svg


def stage_file(path, payload):
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".stats-", suffix=".tmp", delete=False) as temp:
        temp.write(payload)
        return Path(temp.name)


def main():
    staged = []
    try:
        parser = CalendarParser()
        parser.feed(fetch(CALENDAR_URL, "text/html").decode("utf-8"))
        data = parser.result()
        chart = validate_chart(fetch(CHART_URL, "image/svg+xml"))
        encoded = (json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        ASSETS.mkdir(parents=True, exist_ok=True)
        for name, payload in [("github-stats.json", encoded), ("github-activity.svg", chart)]:
            target = ASSETS / name
            staged.append((stage_file(target, payload), target))
        for temp, target in staged:
            os.replace(temp, target)
        print(f"Updated public GitHub activity: {data['contributions']['total']} contributions.")
        return 0
    except Exception as error:
        print(f"Activity refresh failed; previous files kept. {type(error).__name__}: {error}", file=sys.stderr)
        return 1
    finally:
        for temp, _ in staged:
            temp.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())
