const wrap = (body, cls = '') => `<svg class="${cls}" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="currentColor" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const icons = {
  teeth: '<rect x="14" y="33" width="14" height="36" rx="6" fill="#91D4DA"/><path d="M19 34V13h16v18H20M27 16h11M27 22h11M27 28h11"/><path d="M45 18c8-6 18-1 18 8 0 6-3 8-4 16-1 9-5 12-7 2-1-6-4-6-5 0-2 10-6 7-7-2-1-8-5-18 5-24Z" fill="#fff"/>',
  potty: '<rect x="16" y="12" width="38" height="25" rx="5" fill="#BFE6F0"/><path d="M13 38h52c0 16-8 23-25 23H28C20 57 15 49 13 38Z" fill="#fff"/><path d="M29 60v9h24V56M44 21h5M12 37h56"/>',
  clothes: '<path d="m24 14-16 13 11 15 9-6v31h30V36l8 6 10-15-17-13H47c-1 10-9 10-11 0Z" fill="#F3BE72"/><path d="M36 14c1 10 10 10 11 0M37 43h12M28 59h30"/>',
  breakfast: '<circle cx="39" cy="42" r="25" fill="#F7D68C"/><circle cx="39" cy="42" r="18" fill="#fff"/><path d="M24 45c-5-16 14-26 22-11 14-2 16 17 3 20-12 7-26 3-25-9Z" fill="#FFF4C1"/><circle cx="38" cy="43" r="7" fill="#F3B344"/><path d="M7 18v49M71 18v49M66 18v15h10V18"/>',
  backpack: '<path d="M31 18v-5c0-8 20-8 20 0v5"/><path d="M18 29c0-19 44-19 44 0v36c0 5-44 5-44 0Z" fill="#91CBDC"/><rect x="25" y="41" width="30" height="21" rx="6" fill="#F7BC70"/><path d="M26 46h28M39 26h3M14 31v27M66 31v27"/>',
  hair: '<rect x="21" y="11" width="34" height="39" rx="14" fill="#EBA9C5"/><path d="M31 49v20h13V49M28 19v20M35 17v24M42 17v24M49 19v20"/>',
  light: '<path d="M25 43c-20-23 4-42 20-34 18 7 16 24 6 34-5 4-5 9-5 11H32c0-5-3-9-7-11Z" fill="#FFE19A"/><path d="M32 54h14v9H32zM35 68h9M38 49V31m0 6-7-6m7 6 7-6M9 25H3M14 9 9 4M59 8l5-5M66 26h8"/>',
  shoes: '<path d="M9 28h17l7 12 25 9c14 5 14 17 2 17H15c-9 0-10-6-6-14Z" fill="#F4B170"/><path d="M8 59h61M26 40l10-6M34 46l9-6M45 49l8-5M20 28v13"/><path d="M48 12h22v24M58 23l12 13 8-12"/>',
  unpack: '<path d="M22 36c0-13 36-13 36 0v28H22Z" fill="#B8DCEB"/><rect x="28" y="44" width="23" height="14" rx="4" fill="#F6C777"/><path d="M39 31V8m-9 9 9-9 9 9M8 57v12h64V57"/><rect x="56" y="15" width="12" height="18" rx="2" fill="#EAAAC4"/>',
  hook: '<path d="M40 29V13c0-10 18-10 18 0 0 7-7 10-13 12"/><path d="M29 34v-5c0-6 21-6 21 0v5"/><rect x="20" y="32" width="39" height="37" rx="10" fill="#A0CDD9"/><rect x="28" y="47" width="24" height="14" rx="4" fill="#F7C580"/>',
  laundry: '<path d="m13 30 8 39h40l8-39Z" fill="#B6DEE0"/><path d="M8 29h64M29 42v16M41 42v16M53 42v16"/><path d="m20 28 4-18 14 3 10-7 12 12-4 10" fill="#E9AFCA"/>',
  snack: '<rect x="10" y="25" width="60" height="43" rx="9" fill="#F5BE6E"/><path d="M10 40h60M30 25v-9h20v9"/><path d="M38 46c-13-7-17 6-9 15 4 5 6 1 9 2 8 4 17-19 0-17Z" fill="#E6A6B9"/><path d="M38 45c-1-5 1-7 4-8"/>',
  pjs: '<path d="M23 12 8 24l8 16 11-6-4 34h35l-4-34 10 6 9-16-16-12H46l-6 9-7-9Z" fill="#BAC1EB"/><path d="M40 21v45M31 51h-5M49 51h6"/><path d="m27 27 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#FFE79E"/><path d="M45 32h1M45 42h1M45 53h1"/>',
  sun: '<circle cx="40" cy="40" r="18" fill="#FFD06A"/><path d="M40 7v8M40 65v8M7 40h8M65 40h8M17 17l6 6M57 57l6 6M17 63l6-6M57 23l6-6"/><path d="M33 39h.2M47 39h.2M34 47q6 5 12 0"/>',
  afternoon: '<path d="M9 62h63M15 71h51"/><path d="M19 54a22 22 0 0 1 44 0" fill="#F8BB6C"/><path d="M41 13v9M13 27l7 7M65 27l-7 7M32 46h.2M49 46h.2"/>',
  moon: '<path d="M54 9C17 1 5 45 30 64c18 15 42 1 45-12C42 65 29 26 54 9Z" fill="#E8DCF2"/><path d="m61 15 2 7 7 2-7 2-2 7-2-7-7-2 7-2ZM18 12v7m-4-3h8" fill="#FFE0A0"/>',
  check: '<path d="m18 41 15 15 30-33"/>',
  speaker: '<path d="M13 32h14l17-13v42L27 48H13Z" fill="currentColor" stroke-width="2"/><path d="M54 29q11 11 0 22M63 19q22 21 0 42"/>',
  mute: '<path d="M13 32h14l17-13v42L27 48H13Z" fill="currentColor" stroke-width="2"/><path d="m56 31 18 18m0-18L56 49"/>',
  arrow: '<path d="M15 40h47M47 23l17 17-17 17"/>',
};
export function icon(name, cls) { return wrap(icons[name] || icons.check, cls); }
export function cat(sleepy = false) {
  return `<svg viewBox="0 0 160 130" fill="none" aria-hidden="true"><g stroke="#76546E" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"><path d="M124 99c39 1 34-34 19-29"/><path d="M40 106c-4-32 12-50 42-50 26 0 39 23 36 50Z" fill="#ECAFC7"/><path d="M34 57 30 12l31 20c14-6 24-6 36 0l31-20-5 45c13 38-101 41-89 0Z" fill="#F9CFDF"/><path d="m39 29 15 10-13 6M118 29l-15 10 13 6" fill="#EAA6BF"/>${sleepy ? '<path d="m52 56 7 4 7-4m28 0 7 4 7-4"/>' : '<path d="M57 55v5m46-5v5"/>'}<path d="m75 62 5 4 5-4Z" fill="#B2738F"/><path d="M80 66v5m0 0q-6 7-12 0m12 0q6 7 12 0M23 57l19 4M21 69l21-1M118 61l19-4M118 68l22 1M48 108h16m27 0h16"/><ellipse cx="50" cy="68" rx="8" ry="4" fill="#EEAEC7" stroke="none"/><ellipse cx="111" cy="68" rx="8" ry="4" fill="#EEAEC7" stroke="none"/></g></svg>`;
}
export function bricks(sleepy = false) {
  return `<svg viewBox="0 0 160 130" fill="none" aria-hidden="true"><g stroke="#376185" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 69 7 81m128-12 16 12"/><rect x="31" y="59" width="99" height="51" rx="8" fill="#69B4D5"/><path d="M53 110v12m55-12v12"/><rect x="42" y="18" width="75" height="62" rx="9" fill="#F5B56F"/><rect x="56" y="8" width="18" height="10" rx="3" fill="#FFD99D"/><rect x="88" y="8" width="18" height="10" rx="3" fill="#FFD99D"/>${sleepy ? '<path d="m59 45 7 4 7-4m19 0 7 4 7-4"/>' : '<path d="M65 42v6m32-6v6"/>'}<path d="M71 59q10 10 20 0"/><rect x="54" y="86" width="20" height="11" rx="3" fill="#A6D9E7"/><rect x="88" y="86" width="20" height="11" rx="3" fill="#A6D9E7"/></g></svg>`;
}
