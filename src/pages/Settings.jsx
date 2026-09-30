import { useState } from 'react';
import { Sun, Moon, SunMoon, Bell, Trash2, Sparkles, Utensils } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT, GOALS } from '../i18n';
import { Segmented, toast, Reveal, Confirm, Sheet } from '../components/ui';
import Questionnaire from '../components/Questionnaire';
import { requestPermission } from '../lib/notify';
import { enablePush, disablePush } from '../lib/push';

export default function Settings() {
  const { t, lang } = useT();
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editMeals, setEditMeals] = useState(false);
  const connectPush = async (perm) => {
    if (perm !== 'granted') return s.set({ pushId: null, pushError: `permission: ${perm}` });
    try {
      s.set({ pushId: await enablePush(useStore.getState()), pushError: null });
    } catch (e) {
      s.set({ pushId: null, pushError: `${e.step}: ${e.message}` });
    }
  };

  const toggleNotif = async () => {
    setBusy(true);
    try {
      if (s.notifEnabled) {
        await disablePush();
        s.set({ notifEnabled: false, pushId: null });
        return;
      }
      const perm = await requestPermission();
      s.set({ notifEnabled: true });
      await connectPush(perm);
      if (perm === 'denied') toast({ title: '🔕', body: t('notifDenied') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings">
      <div className="page-head">
        <h2>{t('settingsTitle')}</h2>
      </div>

      <Reveal className="card">
        <h3>{t('profile')}</h3>
        <label className="field">
          <span>{t('name')}</span>
          <input value={s.name} onChange={(e) => s.set({ name: e.target.value })} />
        </label>
        <span className="field-label">{t('goal')}</span>
        <div className="goal-grid">
          {GOALS.map((g) => (
            <button key={g.id} className={s.goal === g.id ? 'goal-btn on' : 'goal-btn'} onClick={() => s.set({ goal: g.id })}>
              <span>{g.emoji}</span> {t(g)}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal className="card">
        <h3>{t('language')}</h3>
        <Segmented
          value={lang}
          onChange={(v) => s.set({ lang: v })}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Reveal>

      <Reveal className="card">
        <h3>{t('theme')}</h3>
        <Segmented
          value={s.themeMode}
          onChange={(v) => s.set({ themeMode: v })}
          options={[
            { value: 'auto', label: t('auto'), icon: <SunMoon size={15} /> },
            { value: 'day', label: t('day'), icon: <Sun size={15} /> },
            { value: 'night', label: t('night'), icon: <Moon size={15} /> },
          ]}
        />
        <p className="muted small hint-below">{t('autoHint')}</p>
      </Reveal>

      <Reveal className="card">
        <h3>
          <Bell size={18} /> {t('notifications')}
        </h3>
        <label className="switch-row">
          <span>{t('enableNotif')}</span>
          <button role="switch" aria-checked={s.notifEnabled} disabled={busy} className={s.notifEnabled ? 'switch on' : 'switch'} onClick={toggleNotif}>
            <span />
          </button>
        </label>
        {s.notifEnabled && (
          <div className={s.pushId ? 'status ok-status' : 'status'}>
            <span>
              {s.pushId ? t('pushOn') : t('pushOff')}
              {!s.pushId && s.pushError && (
                <>
                  {s.pushError.startsWith('permission') && <small className="push-hint">{t('pushPermHint')}</small>}
                  <small className="push-error">{s.pushError}</small>
                </>
              )}
            </span>
            {!s.pushId && (
              <button
                className="chip"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const perm = await requestPermission();
                  await connectPush(perm);
                  if (perm === 'denied') toast({ title: '🔕', body: t('notifDenied') });
                  setBusy(false);
                }}
              >
                {t('reconnect')}
              </button>
            )}
          </div>
        )}
        <p className="muted small">{t('notifHint')}</p>
      </Reveal>

      <Reveal className="card">
        <h3>
          <Sparkles size={18} /> {t('aiSettings')}
        </h3>
        <p className="muted small">{t('apiKeyHint')}</p>
        <button className="btn ghost" onClick={() => setEditMeals(true)}>
          <Utensils size={16} /> {s.mealProfile?.done ? t('editMealProfile') : t('fillMealProfile')}
        </button>
      </Reveal>

      <button
        className="btn danger ghost-danger"
        onClick={() => setConfirmReset(true)}
      >
        <Trash2 size={16} /> {t('resetData')}
      </button>
      <Sheet open={editMeals} onClose={() => setEditMeals(false)}>
        <Questionnaire
          onSaved={() => {
            setEditMeals(false);
            toast({ title: '✓', body: t('mealProfileSaved') });
          }}
        />
      </Sheet>
      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => s.reset()} danger title={t('confirmReset')} body={t('resetBody')} confirmLabel={t('resetData')} />
    </div>
  );
}
