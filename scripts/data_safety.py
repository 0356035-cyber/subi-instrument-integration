"""业务数据备份与安全校验（整合仓脚本共用）。"""

from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path


MIN_DB_BYTES = 1024
FORBIDDEN_GIT_SUFFIXES = (".db", ".sqlite", ".sqlite3")


def backup_sqlite(source: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    try:
        src_conn = sqlite3.connect(str(source))
        dst_conn = sqlite3.connect(str(dest))
        try:
            src_conn.backup(dst_conn)
        finally:
            dst_conn.close()
            src_conn.close()
    except Exception:
        shutil.copy2(source, dest)


def verify_backup_file(path: Path) -> tuple[bool, str]:
    if not path.exists():
        return False, "file missing"
    size = path.stat().st_size
    if size < MIN_DB_BYTES:
        return False, f"too small ({size} B)"
    try:
        conn = sqlite3.connect(str(path))
        try:
            result = conn.execute("PRAGMA integrity_check").fetchone()
        finally:
            conn.close()
    except sqlite3.DatabaseError as exc:
        return False, f"sqlite error: {exc}"
    if not result or result[0] != "ok":
        return False, f"integrity_check={result}"
    return True, "ok"


def git_tracked_runtime_files(repo_dir: Path) -> list[str]:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_dir), "ls-files", "data", "uploads"],
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return []
    tracked: list[str] = []
    for line in proc.stdout.splitlines():
        rel = line.strip()
        if not rel:
            continue
        name = Path(rel).name
        if name.endswith(FORBIDDEN_GIT_SUFFIXES) or (
            rel.startswith("uploads/") and name not in {".gitkeep", "README.md"}
        ):
            tracked.append(rel)
    return tracked


def cmd_backup(args: argparse.Namespace) -> int:
    source = Path(args.source)
    dest = Path(args.dest)
    if not source.exists():
        print(f"[FAIL] source missing: {source}")
        return 1
    backup_sqlite(source, dest)
    ok, detail = verify_backup_file(dest)
    if not ok:
        print(f"[FAIL] backup invalid: {dest} ({detail})")
        if dest.exists():
            dest.unlink()
        return 1
    print(f"[OK] {dest} ({dest.stat().st_size} B, {detail})")
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    path = Path(args.path)
    ok, detail = verify_backup_file(path)
    if ok:
        print(f"[OK] {path} ({detail})")
        return 0
    print(f"[FAIL] {path} ({detail})")
    return 1


def cmd_check_git(args: argparse.Namespace) -> int:
    repo = Path(args.repo)
    tracked = git_tracked_runtime_files(repo)
    if tracked:
        print("[FAIL] runtime data tracked by git:")
        for item in tracked:
            print(f"  - {item}")
        print("Fix: git rm --cached <path>  (do not delete working copy)")
        return 1
    print(f"[OK] no runtime db/uploads tracked in {repo}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sub-I data safety utilities")
    sub = parser.add_subparsers(dest="command", required=True)

    backup = sub.add_parser("backup", help="online sqlite backup with verify")
    backup.add_argument("source")
    backup.add_argument("dest")
    backup.set_defaults(func=cmd_backup)

    verify = sub.add_parser("verify", help="verify sqlite backup file")
    verify.add_argument("path")
    verify.set_defaults(func=cmd_verify)

    check_git = sub.add_parser("check-git", help="fail if data/uploads tracked in git")
    check_git.add_argument("repo")
    check_git.set_defaults(func=cmd_check_git)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())