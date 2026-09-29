import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Ban, Footprints, Dumbbell, Flower2, Zap, Waves, Bike, Target, ShieldAlert, Clock, Timer } from 'lucide-react';
import { DIETS, dietById } from '../data/diets';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { Segmented, stagger } from '../components/ui';

const EX_ICONS = { footprints: Footprints, dumbbell: Dumbbell, flower: Flower2, zap: Zap, waves: Waves, bike: Bike, target: Target };

function Dots({ n }) {
  return (
    <span className="dots" aria-label={`${n}/3`}>
      {[1, 2, 3].map((k) => (
        <i key={k} className={k <= n ? 'on' : ''} />
      ))}
    </span>
  );
}

function DietList({ onOpen }) {
  const { t } = useT();
  const current = useStore((s) => s.dietId);
  return (
    <>
      <div className="page-head">
        <h2>{t('navDiets')}</h2>
        <p className="muted">{t('welcomeSub')}</p>
      </div>
      <div className="diet-grid">
        {DIETS.map((d, i) => (
          <motion.button
            {...stagger(i)}
            key={d.id}
            className="diet-card"
            style={{ '--g1': d.gradient[0], '--g2': d.gradient[1] }}
            onClick={() => onOpen(d.id)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            {current === d.id && <span className="badge on-plan">{t('currentPlan')}</span>}
            <span className="diet-emoji">{d.emoji}</span>
            <h3>{t(d.name)}</h3>
            <p>{t(d.tagline)}</p>
            <div className="diet-meta">
              <span>
                {t('difficulty')} <Dots n={d.stats.difficulty} />
              </span>
              <span>
                <Clock size={13} /> {t(d.stats.results)}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </>
  );
}

function DietDetail({ id, onBack, go }) {
  const { t, lang } = useT();
  const d = dietById(id);
  const { dietId, chooseDiet, track } = useStore();
  const [tab, setTab] = useState('overview');
  const Back = lang === 'ar' ? ChevronRight : ChevronLeft;

  useEffect(() => track('diets', id), [id, track]);
  const switchTab = (v) => {
    setTab(v);
    track('sections', v);
  };

  return (
    <div className="detail" style={{ '--g1': d.gradient[0], '--g2': d.gradient[1] }}>
      <button className="chip glass" onClick={onBack}>
        <Back size={16} /> {t('back')}
      </button>

      <motion.header {...stagger(0)} className="detail-hero">
        <span className="diet-emoji big">{d.emoji}</span>
        <h1>{t(d.name)}</h1>
        <p>{t(d.tagline)}</p>
        <div className="hero-stats">
          <div>
            <small>{t('difficulty')}</small>
            <Dots n={d.stats.difficulty} />
          </div>
          <div>
            <small>{t('results')}</small>
            <strong>{t(d.stats.results)}</strong>
          </div>
          <div>
            <small>{t('loss')}</small>
            <strong>{t(d.stats.loss)}</strong>
          </div>
        </div>
        <div className="row-gap wrap">
          <button className={dietId === d.id ? 'btn light on' : 'btn light'} onClick={() => chooseDiet(d.id)}>
            {dietId === d.id ? t('currentPlan') : t('startThis')}
          </button>
          {d.id === 'fasting' && (
            <button className="btn outline-light" onClick={() => go('fasting')}>
              <Timer size={16} /> {t('fastingTitle')}
            </button>
          )}
        </div>
      </motion.header>

      <Segmented
        value={tab}
        onChange={switchTab}
        options={[
          { value: 'overview', label: t('overview') },
          { value: 'method', label: t('method') },
          { value: 'foods', label: t('foods') },
          { value: 'exercises', label: t('exercises') },
        ]}
      />

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="detail-body">
        {tab === 'overview' && (
          <>
            <section className="card">
              <p className="lead">{t(d.overview)}</p>
            </section>
            <section className="card">
              <h3>{t('benefits')}</h3>
              <ul className="check-list">
                {d.benefits.map((b, k) => (
                  <li key={k}>
                    <Check size={18} className="ok" /> {t(b)}
                  </li>
                ))}
              </ul>
            </section>
            <section className="card warn">
              <h3>
                <ShieldAlert size={18} /> {t('cautions')}
              </h3>
              <ul className="plain-list">
                {d.cautions.map((c, k) => (
                  <li key={k}>{t(c)}</li>
                ))}
              </ul>
            </section>
          </>
        )}

        {tab === 'method' && (
          <>
            <section className="card">
              <h3>{t('method')}</h3>
              <ol className="steps">
                {d.howTo.map((s, k) => (
                  <li key={k}>
                    <span className="step-n">{k + 1}</span>
                    {t(s)}
                  </li>
                ))}
              </ol>
            </section>
            <section className="card">
              <h3>{t('sampleDay')}</h3>
              <div className="timeline">
                {d.sampleDay.map((m, k) => (
                  <div key={k} className="tl-item">
                    <span className="tl-time mono">{m.time}</span>
                    <span className="tl-dot" />
                    <span>{t(m.meal)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'foods' && (
          <div className="two-col">
            <section className="card food ok-card">
              <h3>
                <Check size={18} /> {t('allowed')}
              </h3>
              <div className="pills">
                {d.allowed.map((f, k) => (
                  <span key={k} className="pill ok">
                    {t(f)}
                  </span>
                ))}
              </div>
            </section>
            <section className="card food no-card">
              <h3>
                <Ban size={18} /> {t('forbidden')}
              </h3>
              <div className="pills">
                {d.forbidden.map((f, k) => (
                  <span key={k} className="pill no">
                    {t(f)}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'exercises' && (
          <div className="ex-grid">
            {d.exercises.map((e, k) => {
              const Icon = EX_ICONS[e.icon] ?? Dumbbell;
              return (
                <motion.section {...stagger(k)} key={k} className="card ex">
                  <span className="ex-ico">
                    <Icon size={22} />
                  </span>
                  <h4>{t(e.name)}</h4>
                  <p className="muted">{t(e.detail)}</p>
                </motion.section>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Diets({ detail, setDetail, go }) {
  return detail ? <DietDetail id={detail} onBack={() => setDetail(null)} go={go} /> : <DietList onOpen={setDetail} />;
}
