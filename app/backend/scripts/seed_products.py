"""
Seed script: populate products table with popular food items from OpenFoodFacts.

Usage (on VM):
    cd /home/nutriaidiary/nutriaidiary-src/app/backend
    venv/bin/python scripts/seed_products.py

Or locally:
    cd app/backend
    python scripts/seed_products.py
"""

import asyncio
import logging
import os
import re
import sys
import unicodedata

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add parent dir to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.products import Product  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Transliteration map (Russian → Latin) ───────────────────────────────────

_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def transliterate(text: str) -> str:
    """Transliterate Russian text to Latin."""
    result = []
    for char in text.lower():
        if char in _TRANSLIT:
            result.append(_TRANSLIT[char])
        else:
            result.append(char)
    return "".join(result)


def make_slug(name: str) -> str:
    """Generate URL-safe slug from product name."""
    # Transliterate Russian characters
    slug = transliterate(name)
    # Normalize unicode
    slug = unicodedata.normalize("NFKD", slug).encode("ascii", "ignore").decode("ascii")
    # Replace spaces and special chars with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    # Remove leading/trailing hyphens, collapse multiple hyphens
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:255]


# ── Product catalog by category ──────────────────────────────────────────────

PRODUCTS_BY_CATEGORY = {
    "Крупы и злаки": [
        "buckwheat", "rice white", "oatmeal", "millet", "barley",
        "quinoa", "bulgur", "couscous", "corn grits", "semolina",
        "rice brown", "wheat flour", "rye flour", "pasta", "noodles",
    ],
    "Мясо и птица": [
        "chicken breast", "chicken thigh", "turkey breast", "beef",
        "pork loin", "ground beef", "lamb", "duck breast",
        "chicken liver", "beef liver", "sausage", "bacon",
        "ham", "veal", "rabbit meat",
    ],
    "Рыба и морепродукты": [
        "salmon", "tuna", "cod", "shrimp", "mackerel",
        "herring", "sardine", "trout", "squid", "crab meat",
        "haddock", "pollock", "sea bass", "mussels", "tilapia",
    ],
    "Молочные продукты": [
        "milk", "kefir", "yogurt", "cottage cheese", "cheese cheddar",
        "cream cheese", "sour cream", "butter", "mozzarella",
        "parmesan", "brie cheese", "gouda cheese", "ricotta",
        "whipped cream", "condensed milk",
    ],
    "Овощи": [
        "potato", "tomato", "cucumber", "carrot", "onion",
        "garlic", "bell pepper", "broccoli", "cauliflower", "cabbage",
        "zucchini", "eggplant", "spinach", "lettuce", "celery",
        "beetroot", "radish", "corn", "green peas", "asparagus",
        "mushroom", "pumpkin", "sweet potato", "green beans", "leek",
    ],
    "Фрукты": [
        "banana", "apple", "orange", "grape", "strawberry",
        "blueberry", "watermelon", "melon", "peach", "pear",
        "kiwi", "mango", "pineapple", "cherry", "plum",
        "raspberry", "lemon", "grapefruit", "pomegranate", "avocado",
    ],
    "Бобовые": [
        "lentils", "chickpeas", "kidney beans", "black beans",
        "soybeans", "green lentils", "pinto beans", "white beans",
        "edamame", "hummus",
    ],
    "Орехи и семена": [
        "almonds", "walnuts", "cashews", "peanuts", "sunflower seeds",
        "pumpkin seeds", "chia seeds", "flax seeds", "hazelnuts",
        "pistachios", "brazil nuts", "macadamia nuts", "sesame seeds",
        "pine nuts", "coconut dried",
    ],
    "Хлеб и выпечка": [
        "bread white", "bread whole wheat", "rye bread", "baguette",
        "croissant", "pita bread", "tortilla", "bagel",
        "crackers", "breadsticks",
    ],
    "Снеки и сладости": [
        "dark chocolate", "milk chocolate", "honey", "jam",
        "popcorn", "potato chips", "granola bar", "cookies",
        "ice cream", "marshmallow",
    ],
    "Напитки": [
        "orange juice", "apple juice", "green tea", "black tea",
        "coffee", "coca cola", "mineral water", "coconut water",
        "soy milk", "almond milk",
    ],
    "Масла и соусы": [
        "olive oil", "sunflower oil", "coconut oil", "sesame oil",
        "mayonnaise", "ketchup", "soy sauce", "mustard",
        "vinegar", "tomato paste",
    ],
    "Яйца": [
        "chicken egg", "quail egg",
    ],
}

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"


async def fetch_product(client: httpx.AsyncClient, search_term: str) -> dict | None:
    """Search OpenFoodFacts for a product and return parsed data."""
    try:
        resp = await client.get(
            OFF_SEARCH_URL,
            params={
                "search_terms": search_term,
                "search_simple": 1,
                "action": "process",
                "json": "true",
                "page_size": 5,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

        products = data.get("products", [])
        if not products:
            return None

        # Find first product with nutriments
        for p in products:
            nutriments = p.get("nutriments", {})
            calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy_100g")
            if not calories:
                continue

            name = (
                p.get("product_name_ru")
                or p.get("product_name_en")
                or p.get("product_name")
                or search_term.title()
            )

            return {
                "barcode": p.get("code"),
                "name": name,
                "brand": p.get("brands", "").split(",")[0].strip() or None,
                "image_url": p.get("image_url"),
                "nutrition_100g": {
                    "calories": round(float(calories), 1),
                    "protein": round(float(nutriments.get("proteins_100g", 0)), 1),
                    "fat": round(float(nutriments.get("fat_100g", 0)), 1),
                    "carbs": round(float(nutriments.get("carbohydrates_100g", 0)), 1),
                    "fiber": round(float(nutriments.get("fiber_100g", 0)), 1),
                    "sugar": round(float(nutriments.get("sugars_100g", 0)), 1),
                    "sodium": round(float(nutriments.get("sodium_100g", 0)), 3),
                    "salt": round(float(nutriments.get("salt_100g", 0)), 2),
                },
                "source_api": "openfoodfacts",
            }

        return None
    except Exception as e:
        logger.warning(f"  Failed to fetch '{search_term}': {e}")
        return None


async def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        from dotenv import load_dotenv
        # Try backend/.env, then app/.env
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        app_dir = os.path.dirname(backend_dir)
        for env_path in [
            os.path.join(backend_dir, ".env"),
            os.path.join(app_dir, ".env"),
        ]:
            if os.path.exists(env_path):
                load_dotenv(env_path)
                break
        database_url = os.environ.get("DATABASE_URL", "")

    if not database_url:
        logger.error("DATABASE_URL not set. Aborting.")
        sys.exit(1)

    # Normalize driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("sqlite://"):
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    total_added = 0
    total_updated = 0
    total_skipped = 0

    async with httpx.AsyncClient() as client:
        async with async_session() as session:
            for category, search_terms in PRODUCTS_BY_CATEGORY.items():
                logger.info(f"\n── {category} ({len(search_terms)} items) ──")

                for term in search_terms:
                    # Check if already exists with slug
                    existing = await session.execute(
                        select(Product).where(
                            Product.name.ilike(f"%{term}%"),
                            Product.slug.isnot(None),
                        )
                    )
                    if existing.scalar_one_or_none():
                        logger.info(f"  ✓ '{term}' already seeded, skipping")
                        total_skipped += 1
                        continue

                    product_data = await fetch_product(client, term)
                    if not product_data:
                        logger.warning(f"  ✗ '{term}' not found on OpenFoodFacts")
                        total_skipped += 1
                        continue

                    slug = make_slug(product_data["name"])

                    # Check if slug already taken
                    slug_exists = await session.execute(
                        select(Product.id).where(Product.slug == slug)
                    )
                    if slug_exists.scalar_one_or_none():
                        slug = f"{slug}-{term.replace(' ', '-')}"

                    # Check if barcode already exists — update with slug
                    if product_data["barcode"]:
                        existing_by_barcode = await session.execute(
                            select(Product).where(
                                Product.barcode == product_data["barcode"]
                            )
                        )
                        existing_product = existing_by_barcode.scalar_one_or_none()
                        if existing_product:
                            existing_product.slug = slug
                            existing_product.category = category
                            if not existing_product.nutrition_100g:
                                existing_product.nutrition_100g = product_data["nutrition_100g"]
                            logger.info(f"  ↻ Updated '{existing_product.name}' → slug={slug}")
                            total_updated += 1
                            await session.commit()
                            continue

                    # Create new product
                    new_product = Product(
                        barcode=product_data["barcode"],
                        slug=slug,
                        name=product_data["name"],
                        brand=product_data["brand"],
                        image_url=product_data["image_url"],
                        nutrition_100g=product_data["nutrition_100g"],
                        category=category,
                        source_api=product_data["source_api"],
                    )
                    session.add(new_product)
                    await session.commit()
                    logger.info(f"  + Added '{new_product.name}' → slug={slug}")
                    total_added += 1

                    # Small delay to be polite to OFF API
                    await asyncio.sleep(0.3)

    await engine.dispose()

    logger.info(f"\n{'='*50}")
    logger.info(f"Done! Added: {total_added}, Updated: {total_updated}, Skipped: {total_skipped}")
    logger.info(f"Total: {total_added + total_updated + total_skipped}")


if __name__ == "__main__":
    asyncio.run(main())
