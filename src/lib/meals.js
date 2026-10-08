// Nutrition questionnaire options and the AI prompts for daily meal plans and meal scans.
import { dietById } from '../data/diets.js';
import { PROTOCOLS } from '../data/fasting.js';

export const GENDERS = [
  { id: 'male', ar: 'ذكر', en: 'Male' },
  { id: 'female', ar: 'أنثى', en: 'Female' },
];

export const ACTIVITY = [
  { id: 'sedentary', emoji: '🪑', ar: 'قليل الحركة', en: 'Sedentary' },
  { id: 'light', emoji: '🚶', ar: 'نشاط خفيف', en: 'Lightly active' },
  { id: 'active', emoji: '🏃', ar: 'نشيط', en: 'Active' },
  { id: 'athlete', emoji: '🏋️', ar: 'رياضي', en: 'Athlete' },
];

export const WORK = [
  { id: 'desk', emoji: '💻', ar: 'عمل مكتبي', en: 'Desk job' },
  { id: 'standing', emoji: '🧍', ar: 'عمل وقوف', en: 'On my feet' },
  { id: 'physical', emoji: '🛠️', ar: 'عمل بدني', en: 'Physical work' },
  { id: 'shifts', emoji: '🌙', ar: 'مناوبات ليلية', en: 'Night shifts' },
  { id: 'student', emoji: '📚', ar: 'طالب', en: 'Student' },
  { id: 'home', emoji: '🏠', ar: 'في المنزل', en: 'At home' },
];

export const CONDITIONS = [
  { id: 'diabetes', ar: 'السكري', en: 'Diabetes' },
  { id: 'hypertension', ar: 'ضغط الدم', en: 'High blood pressure' },
  { id: 'cholesterol', ar: 'الكوليسترول', en: 'High cholesterol' },
  { id: 'kidney', ar: 'أمراض الكلى', en: 'Kidney disease' },
  { id: 'thyroid', ar: 'الغدة الدرقية', en: 'Thyroid' },
  { id: 'digestive', ar: 'القولون / الهضم', en: 'IBS / digestive' },
  { id: 'anemia', ar: 'فقر الدم', en: 'Anemia' },
  { id: 'pregnant', ar: 'حمل / رضاعة', en: 'Pregnant / nursing' },
];

export const ALLERGIES = [
  { id: 'gluten', ar: 'الغلوتين', en: 'Gluten' },
  { id: 'lactose', ar: 'اللاكتوز', en: 'Lactose' },
  { id: 'nuts', ar: 'المكسرات', en: 'Nuts' },
  { id: 'peanuts', ar: 'الفول السوداني', en: 'Peanuts' },
  { id: 'eggs', ar: 'البيض', en: 'Eggs' },
  { id: 'seafood', ar: 'المأكولات البحرية', en: 'Seafood' },
  { id: 'soy', ar: 'الصويا', en: 'Soy' },
  { id: 'sesame', ar: 'السمسم', en: 'Sesame' },
];

export const FOODS = [
  { id: 'chicken', emoji: '🍗', ar: 'الدجاج', en: 'Chicken' },
  { id: 'meat', emoji: '🥩', ar: 'اللحم', en: 'Red meat' },
  { id: 'fish', emoji: '🐟', ar: 'السمك', en: 'Fish' },
  { id: 'eggs', emoji: '🥚', ar: 'البيض', en: 'Eggs' },
  { id: 'dairy', emoji: '🧀', ar: 'الألبان', en: 'Dairy' },
  { id: 'vegetables', emoji: '🥦', ar: 'الخضار', en: 'Vegetables' },
  { id: 'fruit', emoji: '🍎', ar: 'الفواكه', en: 'Fruit' },
  { id: 'legumes', emoji: '🫘', ar: 'البقوليات', en: 'Legumes' },
  { id: 'rice', emoji: '🍚', ar: 'الأرز', en: 'Rice' },
  { id: 'pasta', emoji: '🍝', ar: 'المعكرونة', en: 'Pasta' },
  { id: 'bread', emoji: '🥖', ar: 'الخبز', en: 'Bread' },
  { id: 'soups', emoji: '🍲', ar: 'الشوربات', en: 'Soups' },
  { id: 'salads', emoji: '🥗', ar: 'السلطات', en: 'Salads' },
  { id: 'spicy', emoji: '🌶️', ar: 'الأكل الحار', en: 'Spicy food' },
  { id: 'sweets', emoji: '🍯', ar: 'الحلويات', en: 'Sweets' },
];

export const MEAL_TYPES = {
  breakfast: { ar: 'الفطور', en: 'Breakfast', emoji: '🌅' },
  lunch: { ar: 'الغداء', en: 'Lunch', emoji: '☀️' },
  dinner: { ar: 'العشاء', en: 'Dinner', emoji: '🌙' },
  snack: { ar: 'وجبة خفيفة', en: 'Snack', emoji: '🍏' },
};

const labels = (list, ids = []) => list.filter((x) => ids.includes(x.id)).map((x) => x.en);

// Plain-English profile for the model; free-text answers pass through as written.
function describeProfile(state) {
  const m = state.mealProfile ?? {};
  const diet = dietById(state.dietId ?? 'fasting');
  const protocol = PROTOCOLS.find((p) => p.id === state.protocolId);
  return {
    diet: diet.name.en,
    dietAllowedFoods: diet.allowed.map((x) => x.en),
    dietForbiddenFoods: diet.forbidden.map((x) => x.en),
    fastingProtocol: state.dietId === 'fasting' && protocol ? `${protocol.id} (${protocol.eat}h eating window)` : null,
    goal: state.goal,
    age: m.age || null,
    gender: m.gender || null,
    heightCm: m.height || null,
    weightKg: m.weight || null,
    activityLevel: m.activity || null,
    work: m.work || null,
    sport: m.sport || null,
    healthConditions: m.conditions?.includes('none') ? ['none'] : [...labels(CONDITIONS, m.conditions), m.conditionsOther].filter(Boolean),
    allergiesStrictlyAvoid: m.allergies?.includes('none') ? ['none'] : [...labels(ALLERGIES, m.allergies), m.allergiesOther].filter(Boolean),
    favouriteFoods: [...labels(FOODS, m.likes), m.likesOther].filter(Boolean),
    dislikedFoods: m.dislikes || null,
  };
}

export function mealPlanPrompt(state, lang, day, recentNames = []) {
  const language = lang === 'en' ? 'English' : 'Arabic';
  return {
    system:
      'You are a registered dietitian. Create a varied, realistic one-day meal plan that fits the user\'s diet, goal and profile. ' +
      'Never include any allergen listed in allergiesStrictlyAvoid, and respect health conditions (e.g. low sodium for hypertension, low glycaemic for diabetes). ' +
      'Prefer the user\'s favourite foods, avoid disliked ones, use simple home ingredients common in Arab and Mediterranean kitchens, and do not repeat recent dishes. ' +
      'For intermittent fasting, place every meal inside the eating window and pick times accordingly. Calories must suit age, gender, weight, activity and goal. ' +
      'If a list of groceries the user has bought is given, build the meals mainly from those ingredients (plus basic staples such as oil, spices, salt, onion, garlic, lemon) and name which bought items each meal uses in its ingredients. ' +
      `Write every text field in ${language}. Respond with JSON only, matching this shape: ` +
      '{"meals":[{"type":"breakfast|lunch|dinner|snack","time":"HH:MM","name":"","description":"","ingredients":[""],"calories":0,"protein":0,"carbs":0,"fat":0,"why":""}],' +
      '"totals":{"calories":0,"protein":0,"carbs":0,"fat":0},"tip":""}. Macros are grams. 3–4 meals.',
    user: `Date: ${day}\nRecently suggested (avoid repeating): ${recentNames.join(', ') || 'none'}\nGroceries bought (use these first): ${(state.pantry ?? []).join(', ') || 'none'}\nUser profile:\n${JSON.stringify(describeProfile(state), null, 2)}`,
  };
}

// A week of groceries for the user's diet, based on the plans they've been getting.
export function shoppingPrompt(state, lang, recentPlans = []) {
  const language = lang === 'en' ? 'English' : 'Arabic';
  return {
    system:
      'You are a dietitian writing a practical weekly grocery list for one person. It must cover 7 days of meals for the user\'s diet and goal, ' +
      'build on the dishes in their recent meal plans, respect allergies strictly (never list an allergen) and health conditions, prefer their favourite foods, ' +
      'and use ingredients easy to find in Arab and Mediterranean supermarkets. Give realistic weekly quantities (grams, pieces, litres). ' +
      'Group items by store section, 5–7 sections, 3–10 items each, no duplicates. ' +
      `Write every text field in ${language}. Respond with JSON only, matching this shape: ` +
      '{"groups":[{"name":"","emoji":"","items":[{"name":"","qty":""}]}],"tip":""}',
    user: `Recent meal plans:\n${JSON.stringify(recentPlans.map((p) => p.meals.map((m) => ({ name: m.name, ingredients: m.ingredients }))))}\nUser profile:\n${JSON.stringify(describeProfile(state), null, 2)}`,
  };
}

export function normalizeShopping(raw) {
  const groups = (Array.isArray(raw?.groups) ? raw.groups : []).slice(0, 8).map((g) => ({
    name: str(g.name),
    emoji: str(g.emoji).slice(0, 4),
    items: (Array.isArray(g.items) ? g.items : []).slice(0, 12).map((it) => ({ name: str(it.name), qty: str(it.qty), done: false })).filter((it) => it.name),
  })).filter((g) => g.items.length);
  if (!groups.length) throw new Error('empty list');
  return { groups, tip: str(raw.tip), at: Date.now() };
}

// With `text`, the user describes what they ate instead of sending a photo (manual log or an edited scan).
export function scanPrompt(state, lang, text) {
  const language = lang === 'en' ? 'English' : 'Arabic';
  return {
    system:
      'You are a nutrition expert analysing a photo of a meal. Identify the dish and each visible item, estimate portion sizes in grams, ' +
      'and estimate calories and macros realistically (state uncertainty in the verdict if the photo is unclear). ' +
      'Judge whether it suits the user\'s diet, goal, allergies and health conditions: "yes", "moderate" or "no". ' +
      'If the image shows several separate foods (a collage, poster, menu or grocery photo), name it after the group, list each food as an item ' +
      'with a typical single serving, give totals for one serving of each, and judge each food\'s fit in the verdict and tips. ' +
      'Read any text in the image to help identify foods. Only if there is truly no food at all, set food to false, name to an explanation, calories to 0 and suitable to "no". ' +
      `Write every text field in ${language}. Respond with JSON only, matching this shape: ` +
      '{"food":true,"name":"","items":[{"name":"","grams":0,"calories":0}],"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,' +
      '"suitable":"yes|moderate|no","verdict":"","tips":[""]}',
    user:
      `User profile:\n${JSON.stringify(describeProfile(state), null, 2)}\n` +
      (text ? `There is no photo. The user describes the meal they ate (treat stated grams as exact):\n${String(text).slice(0, 800)}` : 'Analyse the attached meal photo.'),
  };
}

const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
const str = (v) => (typeof v === 'string' ? v.slice(0, 400) : '');

export function normalizePlan(raw, day) {
  const meals = (Array.isArray(raw?.meals) ? raw.meals : []).slice(0, 5).map((m) => ({
    type: MEAL_TYPES[m.type] ? m.type : 'snack',
    time: /^\d{1,2}:\d{2}$/.test(m.time ?? '') ? m.time : '',
    name: str(m.name),
    description: str(m.description),
    ingredients: (Array.isArray(m.ingredients) ? m.ingredients : []).map(str).filter(Boolean).slice(0, 12),
    calories: num(m.calories),
    protein: num(m.protein),
    carbs: num(m.carbs),
    fat: num(m.fat),
    why: str(m.why),
  }));
  if (!meals.length) throw new Error('plan has no meals');
  const sum = (k) => meals.reduce((a, m) => a + m[k], 0);
  return {
    date: day,
    meals,
    totals: { calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') },
    tip: str(raw.tip),
    at: Date.now(),
  };
}

export function normalizeScan(raw) {
  const calories = num(raw?.calories);
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return {
    // Not a meal (no food in the photo): shown once, never saved or logged.
    food: raw?.food !== false && (calories > 0 || items.length > 0),
    name: str(raw?.name),
    items: (Array.isArray(raw?.items) ? raw.items : []).slice(0, 12).map((x) => ({ name: str(x.name), grams: num(x.grams), calories: num(x.calories) })),
    calories: num(raw?.calories),
    protein: num(raw?.protein),
    carbs: num(raw?.carbs),
    fat: num(raw?.fat),
    fiber: num(raw?.fiber),
    suitable: ['yes', 'moderate', 'no'].includes(raw?.suitable) ? raw.suitable : 'moderate',
    verdict: str(raw?.verdict),
    tips: (Array.isArray(raw?.tips) ? raw.tips : []).map(str).filter(Boolean).slice(0, 4),
  };
}

// ── Logging what was actually eaten into a day's plan ──────────────────────
const sumTotals = (meals) => {
  const sum = (k) => meals.reduce((a, m) => a + (m[k] || 0), 0);
  return { calories: sum('calories'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
};
const bare = ({ logged, replaced, extra, ...m }) => m;
// `target` keeps the day's planned calories from the AI plan, so replacements can be compared to it.
const withMeals = (plan, meals) => ({ ...plan, meals, target: plan.target ?? plan.totals?.calories ?? 0, totals: sumTotals(meals) });

// Morning-to-night guess for the meal type of something eaten right now.
export function guessMealType(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h < 10.5 ? 'breakfast' : h < 12 ? 'snack' : h < 15.5 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

// Places an eaten meal into the plan: it replaces (auto-cancels) the first not-yet-eaten suggestion of the
// same type, or is added as an extra. Returns the new plan, eaten indexes and the cancelled suggestion.
export function placeMeal(plan, eaten, meal) {
  const meals = [...plan.meals];
  const done = new Set(eaten);
  let i = meals.findIndex((m, j) => m.type === meal.type && !m.logged && !done.has(j));
  const cancelled = i >= 0 ? meals[i] : null;
  if (cancelled) meals[i] = { ...bare(meal), logged: true, replaced: bare(cancelled) };
  else {
    i = meals.length;
    meals.push({ ...bare(meal), logged: true, extra: true });
  }
  done.add(i);
  return { plan: withMeals(plan, meals), eaten: [...done].sort((a, b) => a - b), index: i, cancelled };
}

// Edits meal `i` in place; editing a suggestion turns it into what was really eaten (keeping the original).
export function editMeal(plan, eaten, i, meal) {
  const meals = [...plan.meals];
  const old = meals[i];
  meals[i] = old.logged ? { ...old, ...bare(meal) } : { ...bare(meal), logged: true, replaced: bare(old) };
  return { plan: withMeals(plan, meals), eaten: [...new Set([...eaten, i])].sort((a, b) => a - b) };
}

// Removes a logged meal: a replacement gives the suggestion back, an extra disappears.
export function unlogMeal(plan, eaten, i) {
  const meals = [...plan.meals];
  const old = meals[i];
  let done = eaten.filter((j) => j !== i);
  if (old?.extra) {
    meals.splice(i, 1);
    done = done.map((j) => (j > i ? j - 1 : j));
  } else if (old?.replaced) meals[i] = old.replaced;
  return { plan: withMeals(plan, meals), eaten: done };
}

// A fresh plan for a day keeps everything already eaten, re-placed over the new suggestions.
export function mergeEaten(oldPlan, eaten, next) {
  let plan = { ...next, meals: next.meals.map(bare) };
  let done = [];
  for (const i of eaten) {
    const m = oldPlan?.meals[i];
    if (m) ({ plan, eaten: done } = placeMeal(plan, done, m));
  }
  return { plan, eaten: done };
}
