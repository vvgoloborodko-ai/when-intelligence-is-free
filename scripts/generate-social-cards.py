from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "logos"
LOGO = Image.open(OUT / "wiif_lighthouse_square_v2_512.png").convert("RGBA")

WIDTH = 1200
HEIGHT = 630
LOGO_SIZE = 580
PAPER = "#FFF1E5"


image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
logo = LOGO.copy()
logo.thumbnail((LOGO_SIZE, LOGO_SIZE), Image.Resampling.LANCZOS)
position = ((WIDTH - logo.width) // 2, (HEIGHT - logo.height) // 2)
image.paste(logo, position, logo)

path = OUT / "social-logo-1200x630.png"
image.save(path, "PNG", optimize=True)
print(path)
