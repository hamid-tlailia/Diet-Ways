import { useStore } from '../store/useStore';
import { tr } from './strings';

export { tr, GOALS, MOODS, STRINGS } from './strings';

export function useT() {
  const lang = useStore((s) => s.lang);
  return { t: (v) => tr(lang, v), lang };
}
