"""批量把 whatwedo 卡片图降采样并重压。
用法: python shrink_webp.py [--apply] [--width 1280] [--quality 82]
不带 --apply 时只试算、报告，不写盘。
"""
import argparse, io, sys
from pathlib import Path
from PIL import Image

def human(n):
    return f"{n/1024:,.0f} KB" if n < 1048576 else f"{n/1048576:.2f} MB"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="真正写盘（默认只试算）")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--dir", default="src/assets/whatwedo")
    a = ap.parse_args()

    files = sorted(Path(a.dir).rglob("*.webp"))
    if not files:
        sys.exit(f"没找到 webp: {a.dir}")

    total_before = total_after = 0
    rows = []
    skipped = []
    for f in files:
        before = f.stat().st_size
        with Image.open(f) as im:
            im.load()
            w, h = im.size
            scale = min(1.0, a.width / w)
            new = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
            if scale < 1.0:
                new = new.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
            buf = io.BytesIO()
            new.save(buf, "WEBP", quality=a.quality, method=6)
            after = buf.tell()
            # 压完更大说明重编码无收益（常见于本就压得很狠的小图）→ 原文件保留不动
            if after >= before:
                skipped.append((f.name, before, after))
                after = before
            elif a.apply:
                f.write_bytes(buf.getvalue())
        total_before += before
        total_after += after
        rows.append((f.name, w, h, new.size, before, after))

    # 按节省量排序输出（节省最多的在前）
    rows.sort(key=lambda r: r[4] - r[5], reverse=True)
    print(f"{'文件':<34}{'原尺寸':>12}{'新尺寸':>12}{'压缩前':>10}{'压缩后':>10}{'倍数':>7}")
    print("-" * 87)
    for name, w, h, (nw, nh), b, aft in rows:
        short = name if len(name) <= 32 else name[:30] + "…"
        print(f"{short:<34}{f'{w}×{h}':>12}{f'{nw}×{nh}':>12}"
              f"{human(b):>10}{human(aft):>10}{f'{b/aft:.2f}x':>7}")
    print("-" * 87)
    print(f"{'合计 (' + str(len(files)) + ' 张)':<34}{'':>12}{'':>12}"
          f"{human(total_before):>10}{human(total_after):>10}{f'{total_before/total_after:.2f}x':>7}")
    if skipped:
        print(f"\n跳过 {len(skipped)} 张（重编码后反而更大，原文件保留）："
              + "、".join(n for n, _, _ in skipped[:8])
              + ("…" if len(skipped) > 8 else ""))
    print()
    print("已写盘 ✅" if a.apply else "试算模式（未写盘）。确认后加 --apply 执行。")

if __name__ == "__main__":
    main()
