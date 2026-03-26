# NutriAI Demo — MVP Development Plan

## Design Guidelines

### Design References
- **MyFitnessPal**: Clean dashboard, macro tracking circles
- **Yazio**: Modern cards, green accent, friendly onboarding
- **Style**: Modern Health App — Clean, Minimal, Mobile-First

### Color Palette
- Primary: #10B981 (Emerald Green — health, freshness)
- Primary Dark: #059669
- Secondary: #6366F1 (Indigo — AI features)
- Background: #0F172A (Dark Slate)
- Surface: #1E293B (Card backgrounds)
- Surface Light: #334155
- Accent: #F59E0B (Amber — warnings, highlights)
- Text Primary: #F8FAFC
- Text Secondary: #94A3B8
- Danger: #EF4444
- Success: #22C55E

### Typography
- Font: Inter (Google Fonts) — clean, modern, excellent readability
- H1: Inter 700, 32px
- H2: Inter 600, 24px
- H3: Inter 600, 18px
- Body: Inter 400, 14px
- Caption: Inter 400, 12px

### Key Component Styles
- Cards: bg-slate-800/50, border border-slate-700/50, rounded-2xl, backdrop-blur
- Buttons Primary: bg-emerald-500 hover:bg-emerald-600, rounded-xl, font-semibold
- Buttons Secondary: bg-indigo-500 hover:bg-indigo-600
- Progress bars: rounded-full, gradient fills
- Bottom nav: fixed bottom, glass morphism, 5 tabs
- Inputs: bg-slate-800, border-slate-600, rounded-xl

### Images to Generate
1. **hero-healthy-food.jpg** — Vibrant overhead shot of colorful healthy meal bowls with fresh vegetables, grains, and lean protein on a dark slate table (photorealistic, food photography)
2. **ai-brain-nutrition.jpg** — Abstract visualization of AI neural network connected to food/nutrition icons, green and indigo glow on dark background (3d, futuristic)
3. **onboarding-fitness.jpg** — Active person preparing a healthy meal in a modern kitchen, warm lighting (photorealistic, lifestyle)
4. **chat-nutritionist.jpg** — Friendly AI assistant avatar with stethoscope and vegetables, modern illustration style on dark background (minimalist, illustration)

---

## Database Tables (Atoms Cloud)

1. **user_profiles** — user_id, gender, age, height_cm, weight_kg, target_weight_kg, goal, activity_level, allergies (text), cuisine_preferences (text), budget_per_week, city, cooking_time_minutes, created_at, updated_at
2. **meal_logs** — user_id, meal_type, food_name, calories, protein, fat, carbs, portion_grams, photo_url, logged_at, created_at
3. **meal_plans** — user_id, plan_data (text/JSON string), week_start, status, created_at
4. **recipes** — id, title, description, cuisine, calories, protein, fat, carbs, cooking_time, servings, ingredients (text), instructions (text), image_url, created_at (create_only=false, public)
5. **chat_messages** — user_id, role, content, created_at
6. **weight_logs** — user_id, weight_kg, logged_at, created_at

## MVP Features (Files to Create)

### Core Files (~8 files max for MVP):
1. **src/pages/Landing.tsx** — Landing page with hero, features, CTA
2. **src/pages/Onboarding.tsx** — 5-step wizard for user profile setup
3. **src/pages/Dashboard.tsx** — Main dashboard with КБЖУ progress, next meal, AI insight
4. **src/pages/MealPlan.tsx** — Weekly meal plan view + recipe details
5. **src/pages/AddFood.tsx** — Photo recognition + manual food entry + search
6. **src/pages/Chat.tsx** — AI nutritionist chat
7. **src/pages/Analytics.tsx** — Charts and statistics (daily/weekly)
8. **src/pages/Profile.tsx** — User profile and settings

### Supporting Files:
- **src/lib/nutrition-calc.ts** — Mifflin-St Jeor КБЖУ calculation
- **src/components/layout/AppLayout.tsx** — Layout with bottom nav + header
- **src/components/layout/BottomNav.tsx** — 5-tab bottom navigation
- Updated **src/App.tsx** — Routes setup

## Development Order
1. Create database tables
2. Generate images
3. Create lib/nutrition-calc.ts
4. Create layout components (AppLayout, BottomNav)
5. Create Landing page
6. Create Onboarding page
7. Create Dashboard page
8. Create MealPlan page
9. Create AddFood page
10. Create Chat page
11. Create Analytics page
12. Create Profile page
13. Update App.tsx with routes
14. Update index.html title
15. Lint & build
16. CheckUI