// Theme-specific motivation: energising by day, calm and reflective by night.
export const QUOTES = {
  day: [
    { ar: 'اليوم فرصة جديدة لتكون أقوى من أمس', en: 'Today is a new chance to be stronger than yesterday' },
    { ar: 'الطاقة تتبع التركيز — ركّز على هدفك', en: 'Energy flows where focus goes — focus on your goal' },
    { ar: 'خطوة صغيرة كل يوم تصنع تحوّلًا كبيرًا', en: 'Small daily steps create big transformations' },
    { ar: 'الشمس أشرقت، وكذلك إرادتك ☀️', en: 'The sun is up, and so is your willpower ☀️' },
    { ar: 'جسمك يسمع كل ما تقوله له عقلك', en: 'Your body hears everything your mind says' },
  ],
  night: [
    { ar: 'أحسنت اليوم. النوم الجيد جزء من النجاح 🌙', en: 'Well done today. Good sleep is part of success 🌙' },
    { ar: 'في هدوء الليل يجدد جسمك نفسه', en: 'In the quiet of night your body renews itself' },
    { ar: 'التقدّم لا يحتاج كمالًا، بل استمرارًا', en: 'Progress needs consistency, not perfection' },
    { ar: 'غدًا نسخة أفضل منك تنتظرك', en: 'A better version of you is waiting for tomorrow' },
    { ar: 'تنفّس بعمق… أنت على الطريق الصحيح ✨', en: 'Breathe deeply… you are on the right path ✨' },
  ],
};

export const quoteOfDay = (theme) => {
  const list = QUOTES[theme];
  const day = Math.floor(Date.now() / 864e5);
  return list[day % list.length];
};
