// Hand-drawn emblem for each fasting stage. Stroke uses currentColor; accents use the stage colour.
const paths = {
  anabolic: (c) => (
    <>
      <path d="M24 8c-6 8-10 13-10 19a10 10 0 0 0 20 0c0-6-4-11-10-19z" fill={c} fillOpacity=".18" />
      <path d="M24 8c-6 8-10 13-10 19a10 10 0 0 0 20 0c0-6-4-11-10-19z" />
      <path d="M24 33v-10M20 27l4-4 4 4" stroke={c} />
    </>
  ),
  falling: (c) => (
    <>
      <path d="M24 8c-6 8-10 13-10 19a10 10 0 0 0 20 0c0-6-4-11-10-19z" fill={c} fillOpacity=".12" />
      <path d="M24 8c-6 8-10 13-10 19a10 10 0 0 0 20 0c0-6-4-11-10-19z" />
      <path d="M24 21v10M20 27l4 4 4-4" stroke={c} />
    </>
  ),
  insulin: (c) => (
    <>
      <circle cx="17" cy="24" r="8" fill={c} fillOpacity=".18" />
      <circle cx="17" cy="24" r="8" />
      <circle cx="17" cy="24" r="2.5" fill={c} stroke="none" />
      <path className="stage-anim-pulse" d="M25 24h16M35 24v6M40 24v4" stroke={c} />
    </>
  ),
  ghrelin: (c) => (
    <>
      <path d="M8 30c4-6 8-6 12 0s8 6 12 0 8-6 8-6" fill="none" />
      <path className="stage-anim-flicker" d="M8 21c4-6 8-6 12 0s8 6 12 0 8-6 8-6" stroke={c} />
      <path d="M8 39c4-4 8-4 12 0s8 4 12 0" strokeOpacity=".5" />
      <circle cx="36" cy="11" r="3" fill={c} stroke="none" />
    </>
  ),
  gluconeo: (c) => (
    <>
      <circle cx="13" cy="24" r="5" fill={c} fillOpacity=".25" />
      <circle cx="13" cy="24" r="5" />
      <path d="M20 24h8M25 20l4 4-4 4" stroke={c} />
      <path d="M37 14c-3.5 4.5-5.5 7.5-5.5 10.5a5.5 5.5 0 0 0 11 0c0-3-2-6-5.5-10.5z" fill={c} fillOpacity=".3" />
      <path className="stage-anim-pulse" d="M37 14c-3.5 4.5-5.5 7.5-5.5 10.5a5.5 5.5 0 0 0 11 0c0-3-2-6-5.5-10.5z" />
    </>
  ),
  hgh: (c) => (
    <>
      <path d="M9 39h30" />
      <rect x="11" y="28" width="6" height="11" rx="1.5" fill={c} fillOpacity=".25" />
      <rect x="21" y="21" width="6" height="18" rx="1.5" fill={c} fillOpacity=".45" />
      <rect x="31" y="13" width="6" height="26" rx="1.5" fill={c} fillOpacity=".7" />
      <path className="stage-anim-pulse" d="M10 22l10-8 7 5 11-10M32 9h6v6" stroke={c} />
    </>
  ),
  clarity: (c) => (
    <>
      <path d="M24 7a12 12 0 0 0-7 21.8V33h14v-4.2A12 12 0 0 0 24 7z" fill={c} fillOpacity=".15" />
      <path d="M24 7a12 12 0 0 0-7 21.8V33h14v-4.2A12 12 0 0 0 24 7z" />
      <path d="M19 38h10M21 42h6" />
      <path className="stage-anim-pulse" d="M24 14v6M20.5 17.5l3.5 3.5 3.5-3.5" stroke={c} />
    </>
  ),
  sensitivity: (c) => (
    <>
      <path d="M24 40S9 31 9 20a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-15 20-15 20z" fill={c} fillOpacity=".14" />
      <path d="M24 40S9 31 9 20a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-15 20-15 20z" />
      <path className="stage-anim-pulse" d="M13 24h6l2.5-5 4 10 2.5-5h7" stroke={c} />
    </>
  ),
  glycogen: (c) => (
    <>
      <rect x="9" y="15" width="27" height="18" rx="4" />
      <path d="M39 21v6" />
      <rect className="stage-anim-drain" x="12.5" y="18.5" width="9" height="11" rx="2" fill={c} stroke="none" />
      <path d="M27 19l-3 5h4l-3 5" stroke={c} />
    </>
  ),
  ketosis: (c) => (
    <>
      <path className="stage-anim-flicker" d="M24 6c2 6 9 9 9 18a9 9 0 0 1-18 0c0-4 2-7 4-9 0 3 1 5 3 6-1-6 0-11 2-15z" fill={c} fillOpacity=".25" />
      <path d="M24 6c2 6 9 9 9 18a9 9 0 0 1-18 0c0-4 2-7 4-9 0 3 1 5 3 6-1-6 0-11 2-15z" />
      <path d="M24 38c-3 0-5-2-5-5 0-3 3-5 5-8 2 3 5 5 5 8 0 3-2 5-5 5z" stroke={c} />
    </>
  ),
  fatburn: (c) => (
    <>
      <circle cx="24" cy="24" r="17" strokeDasharray="3 4" />
      <path className="stage-anim-flicker" d="M20 12c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 0-6 1-9z" fill={c} fillOpacity=".35" stroke={c} />
      <path className="stage-anim-flicker2" d="M29 18c1 3 4 5 4 9a5 5 0 0 1-9 2" stroke={c} />
      <path d="M16 34h16" />
    </>
  ),
  autophagy: (c) => (
    <>
      <circle cx="24" cy="24" r="15" fill={c} fillOpacity=".1" />
      <circle cx="24" cy="24" r="15" />
      <circle cx="24" cy="24" r="4.5" fill={c} fillOpacity=".35" stroke={c} />
      <g className="stage-anim-spin" style={{ transformOrigin: '24px 24px' }} stroke={c}>
        <path d="M24 13a11 11 0 0 1 9.5 5.5" />
        <path d="M33.5 18.5l.3-3.6M33.5 18.5l-3.4-1" />
        <path d="M33 29.5A11 11 0 0 1 16 32" />
        <path d="M16 32l3.4 1M16 32l1-3.4" />
        <path d="M14 27a11 11 0 0 1 2.5-11" />
        <path d="M16.5 16l-3.4 1M16.5 16l.4 3.5" />
      </g>
    </>
  ),
  growth: (c) => (
    <>
      <path d="M24 6l14 5v10c0 9-6 16-14 20-8-4-14-11-14-20V11z" fill={c} fillOpacity=".14" />
      <path d="M24 6l14 5v10c0 9-6 16-14 20-8-4-14-11-14-20V11z" />
      <path className="stage-anim-pulse" d="M26 13l-7 12h6l-2 10 8-13h-6z" fill={c} stroke={c} />
    </>
  ),
  renewal: (c) => (
    <>
      <path d="M16 6c0 9 16 9 16 18s-16 9-16 18" />
      <path d="M32 6c0 9-16 9-16 18s16 9 16 18" stroke={c} />
      <path d="M18 12h12M17 18h14M17 30h14M18 36h12" strokeOpacity=".55" />
      <circle className="stage-anim-pulse" cx="24" cy="24" r="2.5" fill={c} stroke="none" />
    </>
  ),
};

export default function StageIcon({ stage, size = 48, active = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'stage-icon is-active' : 'stage-icon'}
      aria-hidden="true"
    >
      {paths[stage.id](stage.color)}
    </svg>
  );
}
