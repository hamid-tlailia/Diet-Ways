import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useT } from '../i18n';
import { todayKey } from '../lib/dates';

/** Collapsible card section. */
export function Accordion({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={open ? 'card past-acc open' : 'card past-acc'}>
      <button className="acc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <span className="row-gap">
          {count != null && <span className="chip">{count}</span>}
          <ChevronDown size={18} className={open ? 'chev up' : 'chev'} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="acc-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const dayOf = (ms) => todayKey(new Date(ms));

/**
 * A dated history: today's entries (or the newest one) stay visible, earlier ones go in an accordion with a
 * "go to a day" picker. `items` are newest first; `at(item)` gives its time in ms.
 */
export function DatedHistory({ items, at, render, pastTitle, empty }) {
  const { t } = useT();
  const [picked, setPicked] = useState('');
  const today = todayKey();
  // Today's entries stay visible; with none today, the newest one does.
  let recent = items.filter((x) => dayOf(at(x)) === today);
  if (!recent.length && items.length) recent = [items[0]];
  const past = items.filter((x) => !recent.includes(x));
  if (!items.length) return <p className="muted">{empty}</p>;
  const shown = picked ? past.filter((x) => dayOf(at(x)) === picked) : past;
  return (
    <>
      {render(recent)}
      {past.length > 0 && (
        <Accordion title={pastTitle} count={past.length}>
          <label className="date-jump">
            <span>{t('goToDay')}</span>
            <input type="date" value={picked} min={dayOf(at(past.at(-1)))} max={dayOf(at(past[0]))} onChange={(e) => setPicked(e.target.value)} />
            {picked && (
              <button className="chip" onClick={() => setPicked('')}>
                {t('showAll')}
              </button>
            )}
          </label>
          {shown.length ? render(shown) : <p className="muted">{t('nothingThatDay')}</p>}
        </Accordion>
      )}
    </>
  );
}
