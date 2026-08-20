/** Full-bleed "park scene" behind the Home hero card's step rings — a
 *  simplified, flat-shape stand-in for a hand-illustrated running-child
 *  mockup. Not aiming for pixel/style parity with that reference (this
 *  needs real illustration work to match); this keeps the same "a kid
 *  moving through a park" mood using plain SVG shapes so it costs nothing
 *  to render or maintain. */
export default function HeroIllustration({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 260"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3e9eff" />
          <stop offset="100%" stopColor="#dff0ff" />
        </linearGradient>
        <linearGradient id="hero-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12b886" />
          <stop offset="100%" stopColor="#0f9c73" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="260" fill="url(#hero-sky)" />

      {/* sun */}
      <circle cx="345" cy="40" r="24" fill="#ffd166" opacity="0.9" />

      {/* clouds */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="60" cy="40" rx="28" ry="13" />
        <ellipse cx="84" cy="33" rx="19" ry="11" />
        <ellipse cx="230" cy="30" rx="22" ry="10" />
        <ellipse cx="250" cy="37" rx="15" ry="9" />
      </g>

      {/* distant buildings */}
      <g fill="#ffffff" opacity="0.18">
        <rect x="16" y="110" width="30" height="80" rx="3" />
        <rect x="52" y="90" width="26" height="100" rx="3" />
        <rect x="304" y="102" width="28" height="88" rx="3" />
        <rect x="338" y="80" width="30" height="110" rx="3" />
      </g>

      {/* rolling park ground */}
      <path
        d="M0,210 C80,180 130,232 220,200 C300,172 350,210 400,190 L400,260 L0,260 Z"
        fill="url(#hero-ground)"
      />

      {/* winding path */}
      <path
        d="M-10,235 C90,205 140,255 230,222 C300,198 340,225 410,205"
        fill="none"
        stroke="#eaf4ff"
        strokeWidth="20"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* trees */}
      <g>
        <rect x="40" y="160" width="6" height="24" fill="#8a5a34" />
        <circle cx="43" cy="152" r="17" fill="#0f9c73" opacity="0.8" />
        <rect x="358" y="150" width="6" height="26" fill="#8a5a34" />
        <circle cx="361" cy="140" r="18" fill="#12b886" opacity="0.75" />
      </g>

      {/* running child */}
      <g transform="translate(175,175)">
        {/* back leg */}
        <path d="M6,20 C14,32 10,42 22,50" stroke="#123c64" strokeWidth="9" fill="none" strokeLinecap="round" />
        <ellipse cx="24" cy="52" rx="9" ry="4.5" fill="#14263b" />
        {/* front leg */}
        <path d="M-4,20 C-10,34 -2,40 -10,52" stroke="#3e9eff" strokeWidth="9" fill="none" strokeLinecap="round" />
        <ellipse cx="-11" cy="54" rx="9" ry="4.5" fill="#ffffff" />
        {/* torso */}
        <path d="M-10,-6 C-14,6 -8,18 6,20 C14,18 12,4 8,-8 Z" fill="#3e9eff" />
        {/* back arm */}
        <path d="M4,-2 C14,2 16,12 24,10" stroke="#ffd8b0" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* front arm */}
        <path d="M-6,-2 C-16,0 -20,-10 -16,-18" stroke="#ffd8b0" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* head */}
        <circle cx="-1" cy="-22" r="13" fill="#ffd8b0" />
        <path d="M-13,-26 C-13,-36 11,-38 12,-27 C6,-31 -8,-31 -13,-26 Z" fill="#3a2a1a" />
        {/* simple face */}
        <circle cx="-5" cy="-22" r="1.4" fill="#14263b" />
        <path d="M1,-19 C3,-17 5,-18 6,-20" stroke="#14263b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
