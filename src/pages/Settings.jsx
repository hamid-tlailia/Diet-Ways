import { useState } from 'react';
import { Sun, Moon, SunMoon, Bell, Trash2, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT, GOALS } from '../i18n';
import { Segmented, toast } from '../components/ui';
import { requestPermission } from '../lib/notify';
import { enablePush, disablePush } from '../lib/push';
import { generateMessage } from '../lib/coach';

export default function Settings() {
  const { t, lang } = useT();
  const s = useStore();
  const [testing, setTesting] = useState(false);

  const [busy, setBusy] = useState(false);
  const toggleNotif = async () => {
    setBusy(true);
    try {
      if (s.notifEnabled) {
        await disablePush();
        s.set({ notifEnabled: false, pushId: null });
        return;
      }
      const perm = await requestPermission();
      s.set({ notifEnabled: true, lastNotifAt: 0 });
      const pushId = perm === 'granted' ? await enablePush(useStore.getState()).catch(() => null) : null;
      s.set({ pushId });
      if (perm === 'denied') toast({ title: '🔕', body: t('notifDenied') });
    } finally {
      setBusy(false);
    }
  };

  const testAi = async () => {
    setTesting(true);
    try {
      const msg = await generateMessage(useStore.getState());
      s.addMessage(msg);
      toast({ title: msg.source === 'ai' ? t('aiSource') + ' ✓' : t('localSource'), body: msg.text });
    } catch (e) {
      toast({ title: '⚠️', body: String(e.message ?? e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings">
      <div className="page-head">
        <h2>{t('settingsTitle')}</h2>
      </div>

      <section className="card">
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
      </section>

      <section className="card">
        <h3>{t('language')}</h3>
        <Segmented
          value={lang}
          onChange={(v) => s.set({ lang: v })}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
        />
      </section>

      <section className="card">
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
        <p className="muted small">{t('autoHint')}</p>
      </section>

      <section className="card">
        <h3>
          <Bell size={18} /> {t('notifications')}
        </h3>
        <label className="switch-row">
          <span>{t('enableNotif')}</span>
          <button role="switch" aria-checked={s.notifEnabled} disabled={busy} className={s.notifEnabled ? 'switch on' : 'switch'} onClick={toggleNotif}>
            <span />
          </button>
        </label>
        <label className="field inline">
          <span>{t('notifEvery')}</span>
          <select value={s.notifEvery} onChange={(e) => s.set({ notifEvery: Number(e.target.value) })}>
            {[15, 30, 60, 120, 240].map((m) => (
              <option key={m} value={m}>
                {m} {t('minutes')}
              </option>
            ))}
          </select>
        </label>
        {s.notifEnabled && <p className={s.pushId ? 'status ok-status' : 'status'}>{s.pushId ? t('pushOn') : t('pushOff')}</p>}
        <p className="muted small">{t('notifHint')}</p>
      </section>

      <section className="card">
        <h3>
          <Sparkles size={18} /> {t('aiSettings')}
        </h3>
        <p className="muted small">{t('apiKeyHint')}</p>
        <button className="btn primary" disabled={testing} onClick={testAi}>
          <Sparkles size={16} /> {testing ? t('generating') : t('testAi')}
        </button>
      </section>

      <button
        className="btn danger ghost-danger"
        onClick={() => {
          if (window.confirm(t('confirmReset'))) {
            s.reset();
          }
        }}
      >
        <Trash2 size={16} /> {t('resetData')}
      </button>
    </div>
  );
}
