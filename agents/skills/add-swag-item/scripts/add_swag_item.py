#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


IMPORT_RE = re.compile(r'^import swag(?P<number>\d+) from "\./(?P=number)\.webp";$', re.MULTILINE)
ARRAY_END = "\n];\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Add a new swag .webp to src/assets/swag and update swag.ts."
    )
    parser.add_argument("--repo-root", required=True, help="Path to the repository root")
    parser.add_argument(
        "--source",
        help="Path to the new .webp. If omitted, auto-detect a single non-numeric .webp in src/assets/swag.",
    )
    parser.add_argument("--label", required=True, help="Required swag label")
    parser.add_argument("--caption", help="Optional swag caption")
    return parser.parse_args()


def resolve_source(source_arg: str | None, swag_dir: Path) -> Path:
    if source_arg:
        source = Path(source_arg).expanduser().resolve()
        if not source.is_file():
            raise SystemExit(f"Source image does not exist: {source}")
        return source

    candidates = sorted(
        path
        for path in swag_dir.glob("*.webp")
        if not path.stem.isdigit() and path.name != "swag.ts"
    )

    if not candidates:
        raise SystemExit("No source image provided and no non-numeric .webp found in src/assets/swag.")
    if len(candidates) > 1:
        joined = "\n".join(str(candidate) for candidate in candidates)
        raise SystemExit(
            "Multiple non-numeric .webp files found in src/assets/swag. Specify --source explicitly:\n"
            f"{joined}"
        )
    return candidates[0].resolve()


def next_swag_number(swag_ts: str) -> int:
    matches = [int(match.group("number")) for match in IMPORT_RE.finditer(swag_ts)]
    if not matches:
        raise SystemExit("Could not find any existing swag imports in swag.ts.")
    return max(matches) + 1


def move_image(source: Path, destination: Path) -> None:
    if source.suffix.lower() != ".webp":
        raise SystemExit(f"Source image must be a .webp file: {source}")
    if destination.exists():
        raise SystemExit(f"Destination already exists: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(destination))


def append_import(swag_ts: str, swag_number: int) -> str:
    import_line = f'import swag{swag_number} from "./{swag_number}.webp";'
    matches = list(IMPORT_RE.finditer(swag_ts))
    if not matches:
        raise SystemExit("Could not find the swag import block in swag.ts.")
    last_match = matches[-1]
    insert_at = last_match.end()
    return f"{swag_ts[:insert_at]}\n{import_line}{swag_ts[insert_at:]}"


def append_item(swag_ts: str, swag_number: int, label: str, caption: str | None) -> str:
    item_lines = [
        "  {",
        f"    src: swag{swag_number},",
        f'    label: "{escape_string(label)}",',
    ]
    if caption:
        item_lines.append(f'    caption: "{escape_string(caption)}",')
    item_lines.append("  },")
    item_block = "\n".join(item_lines)

    if ARRAY_END not in swag_ts:
        raise SystemExit("Could not find the end of the swags array in swag.ts.")

    return swag_ts.replace(ARRAY_END, f"\n{item_block}{ARRAY_END}", 1)


def escape_string(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\r", "\\r")
        .replace("\n", "\\n")
    )


def main() -> None:
    args = parse_args()
    repo_root = Path(args.repo_root).expanduser().resolve()
    swag_dir = repo_root / "src" / "assets" / "swag"
    swag_ts_path = swag_dir / "swag.ts"

    if not swag_ts_path.is_file():
        raise SystemExit(f"Could not find swag.ts at expected path: {swag_ts_path}")

    source = resolve_source(args.source, swag_dir)
    swag_ts = swag_ts_path.read_text(encoding="utf-8")
    swag_number = next_swag_number(swag_ts)
    destination = swag_dir / f"{swag_number}.webp"

    updated = append_import(swag_ts, swag_number)
    updated = append_item(updated, swag_number, args.label, args.caption)

    move_image(source, destination)
    try:
        swag_ts_path.write_text(updated, encoding="utf-8")
    except Exception:
        if destination.exists() and not source.exists():
            shutil.move(str(destination), str(source))
        raise

    print(f"Added swag{swag_number}")
    print(f"image={destination}")
    print(f'label={args.label}')
    if args.caption:
        print(f"caption={args.caption}")


if __name__ == "__main__":
    main()
