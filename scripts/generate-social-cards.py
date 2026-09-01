from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "logos"
LOGO = Image.open(OUT / "wiif_lighthouse_square_v2_512.png").convert("RGBA")

PAPER = "#F2F4F1"
CARD = "#FBFCFA"
INK = "#10231C"
INK_2 = "#4A5C52"
LINE = "#D9DFD8"
AMBER = "#E8A013"
AMBER_INK = "#8A5C05"
BLUE = "#2775A9"
ROUTE_COLORS = ["#B4463A", "#2775A9", "#8A5C05", "#1E7D53"]

FONT_DIR = Path("C:/Windows/Fonts")


def font(name: str, size: int):
    return ImageFont.truetype(str(FONT_DIR / name), size)


SERIF = font("georgiab.ttf", 64)
SERIF_SMALL = font("georgiab.ttf", 27)
MONO = font("consola.ttf", 20)
MONO_SMALL = font("consola.ttf", 16)
GIANT = font("georgiab.ttf", 176)


def base(surface: str):
    image = Image.new("RGB", (1200, 630), PAPER)
    draw = ImageDraw.Draw(image)
    for y in range(18, 630, 28):
        draw.line((0, y, 1200, y), fill="#E9ECE7", width=1)

    logo = LOGO.copy()
    logo.thumbnail((82, 82), Image.Resampling.LANCZOS)
    image.paste(logo, (62, 42), logo)
    draw.text((164, 55), "WHEN INTELLIGENCE IS FREE", font=MONO, fill=INK)
    draw.text((164, 86), surface.upper(), font=MONO_SMALL, fill=AMBER_INK)
    draw.line((62, 145, 1138, 145), fill=LINE, width=2)
    draw.text((62, 190), surface, font=SERIF, fill=INK)
    draw.text((62, 564), "whenintelligenceisfree.com", font=MONO_SMALL, fill=INK_2)
    return image, draw


def home_card():
    image, draw = base("Home")
    labels = ["SUBSTITUTE", "AMPLIFY", "REPRICE", "UNLOCK"]
    x0, y0, width, gap = 62, 325, 252, 16
    for index, (label, color) in enumerate(zip(labels, ROUTE_COLORS)):
        x = x0 + index * (width + gap)
        draw.rounded_rectangle((x, y0, x + width, y0 + 150), radius=14, fill=CARD, outline=LINE, width=2)
        draw.rectangle((x, y0, x + width, y0 + 7), fill=color)
        draw.ellipse((x + 18, y0 + 28, x + 56, y0 + 66), fill=PAPER, outline=color, width=3)
        draw.text((x + 18, y0 + 91), label, font=MONO_SMALL, fill=color)
    return image


def research_card():
    image, draw = base("Research")
    x0, y0, total_width, height = 62, 320, 1076, 170
    phase_width = total_width // 3
    fills = ["#F5EBD9", "#F6E7E4", "#E3F0E8"]
    labels = ["BUILDOUT", "DIGESTION", "DIFFUSION"]
    for index in range(3):
        left = x0 + index * phase_width
        right = x0 + (index + 1) * phase_width if index < 2 else x0 + total_width
        draw.rectangle((left, y0, right, y0 + height), fill=fills[index], outline=CARD)
        draw.text((left + 18, y0 + 16), labels[index], font=MONO_SMALL, fill=ROUTE_COLORS[index + 1])
    points = [(x0, y0 + 145), (x0 + 190, y0 + 132), (x0 + 360, y0 + 104), (x0 + 570, y0 + 86), (x0 + 810, y0 + 56), (x0 + total_width, y0 + 27)]
    draw.line(points, fill=AMBER_INK, width=6, joint="curve")
    draw.ellipse((x0 + 180, y0 + 122, x0 + 200, y0 + 142), fill=AMBER, outline=CARD, width=3)
    return image


def investments_card():
    image, draw = base("Investments")
    left, top, right, bottom = 62, 315, 1138, 500
    draw.rounded_rectangle((left, top, right, bottom), radius=14, fill=CARD, outline=LINE, width=2)
    for index in range(1, 5):
        y = top + index * (bottom - top) / 5
        draw.line((left + 24, y, right - 24, y), fill="#E4E8E3", width=2)
    strategy = [(left + 30, bottom - 35), (left + 180, bottom - 70), (left + 340, bottom - 48), (left + 510, bottom - 110), (left + 690, bottom - 128), (left + 850, bottom - 150), (right - 30, top + 32)]
    benchmark = [(left + 30, bottom - 35), (left + 180, bottom - 54), (left + 340, bottom - 80), (left + 510, bottom - 86), (left + 690, bottom - 112), (left + 850, bottom - 120), (right - 30, top + 72)]
    draw.line(benchmark, fill="#7D8FA0", width=5, joint="curve")
    draw.line(strategy, fill=AMBER_INK, width=7, joint="curve")
    draw.ellipse((right - 38, top + 24, right - 22, top + 40), fill=AMBER)
    return image


def advisory_card():
    image, draw = base("Advisory")
    draw.line((62, 322, 62, 490), fill=AMBER, width=10)
    draw.text((96, 292), "?", font=GIANT, fill=AMBER_INK)
    draw.text((270, 348), "A clearer strategic choice", font=SERIF_SMALL, fill=INK)
    draw.line((270, 405, 1080, 405), fill=LINE, width=3)
    draw.line((270, 445, 900, 445), fill=LINE, width=3)
    return image


CARDS = {
    "home": home_card,
    "research": research_card,
    "investments": investments_card,
    "advisory": advisory_card,
}


for name, make_card in CARDS.items():
    path = OUT / f"social-{name}-1200x630.png"
    make_card().save(path, "PNG", optimize=True)
    print(path)
