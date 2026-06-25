"""SQLite online backup with file-copy fallback."""
import shutil
import sqlite3
import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: sqlite_backup.py <source> <dest>")
        return 1
    src, dst = sys.argv[1], sys.argv[2]
    try:
        source = sqlite3.connect(src)
        dest = sqlite3.connect(dst)
        source.backup(dest)
        dest.close()
        source.close()
    except Exception:
        shutil.copy2(src, dst)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())