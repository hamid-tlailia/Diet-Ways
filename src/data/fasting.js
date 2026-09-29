export const PROTOCOLS = [
  { id: '12:12', fast: 12, eat: 12, level: { ar: 'مبتدئ', en: 'Beginner' }, desc: { ar: 'بداية لطيفة: صيام الليل مع تأخير الفطور قليلًا', en: 'Gentle start: overnight fast plus a slightly later breakfast' } },
  { id: '14:10', fast: 14, eat: 10, level: { ar: 'مبتدئ+', en: 'Beginner+' }, desc: { ar: 'خطوة تالية ممتازة لتعويد الجسم', en: 'A great next step to adapt your body' } },
  { id: '16:8', fast: 16, eat: 8, level: { ar: 'متوسط', en: 'Intermediate' }, desc: { ar: 'الأشهر والأكثر فعالية: نافذة أكل 8 ساعات', en: 'The most popular and effective: an 8-hour eating window' } },
  { id: '18:6', fast: 18, eat: 6, level: { ar: 'متقدم', en: 'Advanced' }, desc: { ar: 'يدخل بك إلى بداية الالتهام الذاتي', en: 'Takes you into the start of autophagy' } },
  { id: '20:4', fast: 20, eat: 4, level: { ar: 'المحارب', en: 'Warrior' }, desc: { ar: 'حمية المحارب: وجبة رئيسية ووجبة صغيرة', en: 'Warrior diet: one main meal and one small meal' } },
  { id: 'OMAD', fast: 23, eat: 1, level: { ar: 'خبير', en: 'Expert' }, desc: { ar: 'وجبة واحدة يوميًا لأصحاب الخبرة', en: 'One meal a day, for experienced fasters' } },
  { id: '36h', fast: 36, eat: 0, level: { ar: 'صيام الراهب', en: 'Monk fast' }, desc: { ar: 'صيام ممتد 36 ساعة، مرة أسبوعيًا كحد أقصى وبإشراف', en: 'Extended 36-hour fast, max once a week and with care' } },
];

// Metabolic stages keyed by the hour they begin.
export const STAGES = [
  {
    id: 'anabolic',
    from: 0,
    color: '#f59e0b',
    name: { ar: 'ارتفاع السكر', en: 'Blood sugar rises' },
    short: { ar: 'هضم وامتصاص', en: 'Digesting' },
    body: {
      ar: 'جسمك يهضم آخر وجبة. يرتفع السكر في الدم ويفرز البنكرياس الإنسولين لتخزين الطاقة في الكبد والعضلات. هذه مرحلة بناء (Anabolic).',
      en: 'Your body is digesting your last meal. Blood sugar rises and the pancreas releases insulin to store energy in the liver and muscles. This is the anabolic (building) phase.',
    },
    tip: { ar: 'اشرب كوب ماء وابدأ يومك بهدوء.', en: 'Drink a glass of water and settle in.' },
  },
  {
    id: 'falling',
    from: 4,
    color: '#eab308',
    name: { ar: 'انخفاض السكر', en: 'Blood sugar falls' },
    short: { ar: 'استقرار الطاقة', en: 'Settling' },
    body: {
      ar: 'انتهى الهضم تقريبًا وينخفض الإنسولين. يبدأ الجسم بالاعتماد على مخزون الجليكوجين. قد تشعر بجوع خفيف — إنه مؤقت ويأتي على شكل موجات.',
      en: 'Digestion is mostly done and insulin drops. The body starts relying on stored glycogen. Mild hunger may appear — it is temporary and comes in waves.',
    },
    tip: { ar: 'الشاي الأخضر يساعد على تجاوز موجة الجوع.', en: 'Green tea helps you ride out the hunger wave.' },
  },
  {
    id: 'glycogen',
    from: 8,
    color: '#84cc16',
    name: { ar: 'استنزاف الجليكوجين', en: 'Glycogen depletion' },
    short: { ar: 'تحوّل الوقود', en: 'Fuel switch' },
    body: {
      ar: 'مخازن الجليكوجين في الكبد تتناقص. يبدأ الجسم تحويل الوقود نحو الدهون ويصنع الجلوكوز من مصادر أخرى (Gluconeogenesis).',
      en: 'Liver glycogen stores are running low. Your body starts switching fuel toward fat and makes glucose from other sources (gluconeogenesis).',
    },
    tip: { ar: 'نزهة خفيفة الآن تسرّع التحوّل لحرق الدهون.', en: 'A light walk now speeds up the switch to fat burning.' },
  },
  {
    id: 'ketosis',
    from: 12,
    color: '#f97316',
    name: { ar: 'بداية الكيتوزية', en: 'Ketosis begins' },
    short: { ar: 'حرق الدهون', en: 'Fat burning' },
    body: {
      ar: 'أنت الآن في منطقة حرق الدهون! يفكك الكبد الدهون إلى كيتونات تغذي الدماغ والعضلات. يزداد التركيز وتستقر الطاقة.',
      en: 'You are now in the fat-burning zone! The liver breaks fat down into ketones that fuel your brain and muscles. Focus sharpens and energy stabilises.',
    },
    tip: { ar: 'هذا أفضل وقت للعمل الذهني العميق.', en: 'This is prime time for deep focused work.' },
  },
  {
    id: 'fatburn',
    from: 16,
    color: '#ef4444',
    name: { ar: 'حرق دهون مكثف', en: 'Deep fat burning' },
    short: { ar: 'كيتونات مرتفعة', en: 'High ketones' },
    body: {
      ar: 'ارتفعت الكيتونات بشكل ملحوظ ويستخدم الجسم الدهون كمصدر طاقة رئيسي. يرتفع هرمون النورأدرينالين مما يعزز الحرق والانتباه.',
      en: 'Ketones are markedly elevated and fat is now your main fuel. Norepinephrine rises, boosting both fat burning and alertness.',
    },
    tip: { ar: 'أضف رشة ملح للماء للحفاظ على الأملاح.', en: 'Add a pinch of salt to your water to keep electrolytes up.' },
  },
  {
    id: 'autophagy',
    from: 18,
    color: '#a855f7',
    name: { ar: 'الالتهام الذاتي', en: 'Autophagy' },
    short: { ar: 'تجديد الخلايا', en: 'Cell renewal' },
    body: {
      ar: 'تبدأ الخلايا بتنظيف نفسها: تُفكَّك البروتينات التالفة والمكونات القديمة ويُعاد تدويرها. عملية فاز مكتشفها بجائزة نوبل 2016.',
      en: 'Your cells start cleaning house: damaged proteins and old components are broken down and recycled. Its discoverer won the 2016 Nobel Prize.',
    },
    tip: { ar: 'استرخِ وتنفّس بعمق — جسمك يجدد نفسه.', en: 'Relax and breathe deeply — your body is renewing itself.' },
  },
  {
    id: 'growth',
    from: 24,
    color: '#3b82f6',
    name: { ar: 'ذروة هرمون النمو', en: 'Growth hormone surge' },
    short: { ar: 'حماية العضلات', en: 'Muscle guard' },
    body: {
      ar: 'يرتفع هرمون النمو بشكل كبير ليحمي العضلات ويعزز حرق الدهون. يتعمّق الالتهام الذاتي وتنخفض الالتهابات.',
      en: 'Growth hormone rises sharply to protect muscle and amplify fat burning. Autophagy deepens and inflammation drops.',
    },
    tip: { ar: 'استمع لجسمك جيدًا، واكسر الصيام إن شعرت بتعب.', en: 'Listen to your body closely; break the fast if you feel unwell.' },
  },
  {
    id: 'renewal',
    from: 36,
    color: '#06b6d4',
    name: { ar: 'تجديد عميق', en: 'Deep renewal' },
    short: { ar: 'إعادة ضبط', en: 'Reset' },
    body: {
      ar: 'مرحلة صيام ممتد: ذروة الالتهام الذاتي وتحسّن كبير في حساسية الإنسولين. لا تتجاوزها دون خبرة أو إشراف طبي.',
      en: 'Extended fasting: autophagy peaks and insulin sensitivity improves dramatically. Do not go beyond this without experience or medical supervision.',
    },
    tip: { ar: 'اكسر الصيام تدريجيًا بمرق أو وجبة خفيفة.', en: 'Break the fast gently with broth or a light meal.' },
  },
];

export const stageAt = (hours) => {
  let current = STAGES[0];
  for (const s of STAGES) if (hours >= s.from) current = s;
  return current;
};

export const nextStage = (hours) => STAGES.find((s) => s.from > hours) ?? null;
