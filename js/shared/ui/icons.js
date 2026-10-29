// Icônes SVG en ligne (trait 1.75, bouts arrondis) — aucune dépendance externe.
// Chaque icône hérite de `currentColor` et remplit son conteneur (.icon).

const wrap = (paths) => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    ${paths}
  </svg>
`;

export const icons = {
  users: wrap(`
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="9" cy="8" r="3.25" />
    <path d="M15.5 14.2A3.5 3.5 0 0 1 19 17.5V19" />
    <path d="M14.3 5.1a3.25 3.25 0 0 1 0 6.1" />
  `),
  calendar: wrap(`
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v3.5" />
    <path d="M16 3v3.5" />
  `),
  settings: wrap(`
    <path d="M4 7h9" /><path d="M17 7h3" /><circle cx="15" cy="7" r="2" />
    <path d="M4 17h3" /><path d="M11 17h9" /><circle cx="9" cy="17" r="2" />
  `),
  plus: wrap(`<path d="M12 5v14" /><path d="M5 12h14" />`),
  minus: wrap(`<path d="M5 12h14" />`),
  search: wrap(`<circle cx="10.5" cy="10.5" r="6.5" /><path d="M19.5 19.5 15 15" />`),
  phone: wrap(`
    <path d="M6.6 3.75h2.4l1.5 4.2-1.95 1.5a12 12 0 0 0 5 5l1.5-1.95 4.2 1.5v2.4c0 1-.85 1.8-1.85 1.7A16.5 16.5 0 0 1 4.9 5.6c-.1-1 .7-1.85 1.7-1.85Z" />
  `),
  message: wrap(`
    <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h14a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 1-1.5 1.5h-9.2L6 20v-3.5H5A1.5 1.5 0 0 1 3.5 15Z" />
  `),
  back: wrap(`<path d="M15 5.5 8.5 12l6.5 6.5" />`),
  chevronRight: wrap(`<path d="M9 5.5 15.5 12 9 18.5" />`),
  more: `
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" />
    </svg>
  `,
  chevronDown: wrap(`<path d="M5.5 9 12 15.5 18.5 9" />`),
  chevronLeft: wrap(`<path d="M15 5.5 8.5 12l6.5 6.5" />`),
  x: wrap(`<path d="M6 6l12 12" /><path d="M18 6 6 18" />`),
  check: wrap(`<path d="M5 12.5 9.5 17 19 6.5" />`),
  clock: wrap(`<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />`),
  edit: wrap(`<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16Z" /><path d="m13.5 6.5 4 4" />`),
  trash: wrap(`
    <path d="M4.5 7h15" /><path d="M9.5 7V4.5h5V7" />
    <path d="M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  `),
  scissors: wrap(`
    <circle cx="6.5" cy="6.5" r="2.25" />
    <circle cx="6.5" cy="17.5" r="2.25" />
    <path d="M8.2 8.1 20 19.5" />
    <path d="M8.2 15.9 20 4.5" />
  `),
  // Ticket poinçonné : la carte fidélité percée d'un trou.
  punch: wrap(`
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4Z" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
  `),
  gift: wrap(`
    <rect x="3.5" y="9.5" width="17" height="10.5" rx="1.5" />
    <path d="M3.5 13.5h17" />
    <path d="M12 9.5v10.5" />
    <path d="M12 9.5c-1.4 0-4-1-4-3.1C8 4.85 9 3.75 10.3 3.75c1.6 0 1.7 3.15 1.7 5.75Z" />
    <path d="M12 9.5c1.4 0 4-1 4-3.1 0-1.55-1-2.65-2.3-2.65-1.6 0-1.7 3.15-1.7 5.75Z" />
  `),
  download: wrap(`<path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 19.5h14" />`),
  upload: wrap(`<path d="M12 15V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M5 19.5h14" />`),
  cloud: wrap(`<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4.25 4.25 0 0 1-.5 8.5Z" />`),
  cloudOff: wrap(`
    <path d="M9 6.3A6 6 0 0 1 18 10a4.25 4.25 0 0 1 2.2 7.6" />
    <path d="M16 18.5H7a4.5 4.5 0 0 1-1.4-8.78" />
    <path d="M3.5 3.5l17 17" />
  `),
  sync: wrap(`
    <path d="M19.5 9A8 8 0 0 0 5 7.5" /><path d="M4.5 4v3.5H8" />
    <path d="M4.5 15A8 8 0 0 0 19 16.5" /><path d="M19.5 20v-3.5H16" />
  `),
  history: wrap(`<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" /><path d="M4.5 4.5V9H9" /><path d="M12 8v4l2.5 2" />`),
  bell: wrap(`
    <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  `),
  userX: wrap(`
    <circle cx="10" cy="8" r="3.5" />
    <path d="M3.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 3.2 1.15" />
    <path d="m16.5 15.5 4 4" /><path d="m20.5 15.5-4 4" />
  `),
  user: wrap(`<circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />`),
};
