#!/usr/bin/env python3
"""
Generate a small "lucky" favicon PNG (no external dependencies).

Output: ../favicon.png
"""

from __future__ import annotations

import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RGBA:
    r: int
    g: int
    b: int
    a: int


def clamp255(x: float) -> int:
    if x <= 0:
        return 0
    if x >= 255:
        return 255
    return int(x)


def blend_over(dst: RGBA, src: RGBA) -> RGBA:
    sa = src.a / 255.0
    da = dst.a / 255.0
    out_a = sa + da * (1.0 - sa)
    if out_a <= 0:
        return RGBA(0, 0, 0, 0)
    out_r = (src.r * sa + dst.r * da * (1.0 - sa)) / out_a
    out_g = (src.g * sa + dst.g * da * (1.0 - sa)) / out_a
    out_b = (src.b * sa + dst.b * da * (1.0 - sa)) / out_a
    return RGBA(clamp255(out_r), clamp255(out_g), clamp255(out_b), clamp255(out_a * 255.0))


def write_png(path: Path, width: int, height: int, rgba_bytes: bytes) -> None:
    if len(rgba_bytes) != width * height * 4:
        raise ValueError("rgba_bytes length mismatch")

    def chunk(typ: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(typ)
        crc = zlib.crc32(data, crc) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", crc)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)

    # No filter, one scanline per row with leading 0 filter byte
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        row = rgba_bytes[y * stride : (y + 1) * stride]
        raw.extend(row)

    idat = zlib.compress(bytes(raw), level=9)
    png = signature + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    size = 64
    w = h = size

    # Colors (emerald + gold)
    emerald = RGBA(5, 150, 105, 255)
    emerald_dark = RGBA(4, 120, 87, 255)
    gold = RGBA(245, 158, 11, 255)
    gold_soft = RGBA(245, 158, 11, 190)
    transparent = RGBA(0, 0, 0, 0)

    # Image buffer
    px: list[RGBA] = [transparent for _ in range(w * h)]

    def set_px(x: int, y: int, c: RGBA) -> None:
        if 0 <= x < w and 0 <= y < h:
            i = y * w + x
            px[i] = blend_over(px[i], c)

    def draw_soft_circle(cx: float, cy: float, r: float, c: RGBA, feather: float = 1.6) -> None:
        x0 = int(max(0, cx - r - 2))
        x1 = int(min(w - 1, cx + r + 2))
        y0 = int(max(0, cy - r - 2))
        y1 = int(min(h - 1, cy + r + 2))
        r2 = r * r
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dx = (x + 0.5) - cx
                dy = (y + 0.5) - cy
                d2 = dx * dx + dy * dy
                if d2 <= r2:
                    set_px(x, y, c)
                else:
                    # soft edge
                    d = (d2 ** 0.5) - r
                    if 0 < d < feather:
                        a = int(c.a * (1.0 - d / feather))
                        if a > 0:
                            set_px(x, y, RGBA(c.r, c.g, c.b, a))

    def draw_line(x0: int, y0: int, x1: int, y1: int, thickness: int, c: RGBA) -> None:
        # Simple thick line by stamping circles along a Bresenham path
        dx = abs(x1 - x0)
        sx = 1 if x0 < x1 else -1
        dy = -abs(y1 - y0)
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        x, y = x0, y0
        r = max(1.0, thickness / 2.0)
        while True:
            draw_soft_circle(x, y, r, c, feather=1.0)
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x += sx
            if e2 <= dx:
                err += dx
                y += sy

    # Clover: 4 leaves + subtle inner shade
    cx, cy = 30.5, 28.5
    leaf_r = 12.5
    offsets = [(-10, 0), (10, 0), (0, -10), (0, 10)]
    for ox, oy in offsets:
        draw_soft_circle(cx + ox, cy + oy, leaf_r, emerald)
        draw_soft_circle(cx + ox + 2.0, cy + oy + 2.0, leaf_r * 0.92, RGBA(0, 0, 0, 18))

    # Small stem
    for t in range(0, 10):
        draw_soft_circle(cx + 8 + t * 0.5, cy + 14 + t * 1.3, 3.6, emerald_dark, feather=1.0)

    # Golden "lucky" upward arrow overlay
    draw_line(18, 44, 46, 18, thickness=4, c=gold_soft)
    # Arrow head
    draw_line(46, 18, 38, 18, thickness=4, c=gold_soft)
    draw_line(46, 18, 46, 26, thickness=4, c=gold_soft)
    draw_soft_circle(46.2, 18.2, 3.4, gold, feather=1.2)

    # Convert to bytes
    buf = bytearray()
    for p in px:
        buf.extend(bytes((p.r, p.g, p.b, p.a)))

    out = Path(__file__).resolve().parent.parent / "favicon.png"
    write_png(out, w, h, bytes(buf))
    print(f"Wrote {out} ({w}x{h})")


if __name__ == "__main__":
    main()

