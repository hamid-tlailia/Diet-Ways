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
    healthConditions: [...labels(CONDITIONS, m.conditions), m.conditionsOther].filter(Boolean),
    allergiesStrictlyAvoid: [...labels(ALLERGIES, m.allergies), m.allergiesOther].filter(Boolean),
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
      `Write every text field in ${language}. Respond with JSON only, matching this shape: ` +
      '{"meals":[{"type":"breakfast|lunch|dinner|snack","time":"HH:MM","name":"","description":"","ingredients":[""],"calories":0,"protein":0,"carbs":0,"fat":0,"why":""}],' +
      '"totals":{"calories":0,"protein":0,"carbs":0,"fat":0},"tip":""}. Macros are grams. 3–4 meals.',
    user: `Date: ${day}\nRecently suggested (avoid repeating): ${recentNames.join(', ') || 'none'}\nUser profile:\n${JSON.stringify(describeProfile(state), null, 2)}`,
  };
}

export function scanPrompt(state, lang) {
  const language = lang === 'en' ? 'English' : 'Arabic';
  return {
    system:
      'You are a nutrition expert analysing a photo of a meal. Identify the dish and each visible item, estimate portion sizes in grams, ' +
      'and estimate calories and macros realistically (state uncertainty in the verdict if the photo is unclear). ' +
      'Judge whether it suits the user\'s diet, goal, allergies and health conditions: "yes", "moderate" or "no". ' +
      'If the image is not food, set name to an explanation, calories to 0 and suitable to "no". ' +
      `Write every text field in ${language}. Respond with JSON only, matching this shape: ` +
      '{"name":"","items":[{"name":"","grams":0,"calories":0}],"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,' +
      '"suitable":"yes|moderate|no","verdict":"","tips":[""]}',
    user: `User profile:\n${JSON.stringify(describeProfile(state), null, 2)}\nAnalyse the attached meal photo.`,
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
  return {
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
