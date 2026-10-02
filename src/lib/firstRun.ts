// @ts-nocheck — framework-free dialog, mounted by components/FirstRun.tsx
// First run of an empty family: five calm steps (tree style → surname → name → about you → parents),
// while the family's tree forms in fog on the right. FirstRun.mount(root, opts) → destroy().
import { THEMES, themeOf, themeName, cap, mascSurname, femSurname, familyTitle } from './treeStyle'
import { mountFog } from './fog'
import { presetType, PRESET_TYPES, PRESET_SRC } from './avatars'

const TXT = {
  ru: {
    eyebrow: 'Ваше древо', title: 'Начнём сначала', of: 'из', next: 'Далее', back: 'Назад', create: 'Создать древо', preview: 'превью вашего древа',
    s1: ['Выберите стиль древа', 'Это фон, на котором будет расти ваша семья. Его можно поменять в любой момент.'],
    s2: ['Как ваша фамилия?', 'Она станет названием вашего древа.', 'Фамилия', 'Например, Ветрова'],
    s3: ['Как вас зовут?', 'С вас начнётся древо. Остальных родных добавим постепенно.', 'Имя', 'Ваше имя'],
    s4: ['Расскажите немного о себе', 'По этим данным мы подберём образ для вашей карточки, пока нет фото.', 'Пол', ['Женский', 'Мужской', 'Не указывать'], 'Дата рождения', 'ДД.ММ.ГГГГ', 'Город', 'Где вы родились', 'Если точной даты нет под рукой, достаточно года.'],
    s5: ['Как зовут ваших родителей?', 'Добавим их в древо над вами. Если кого-то не знаете, оставьте поле пустым.', 'Мама', 'Папа', 'Имя', 'Фамилия'],
    calm: ['Всё, что вы вводите, видно только вам и хранится на этом устройстве.', 'Девичью фамилию и другие варианты можно будет добавить позже в анкете.', 'Видно только вам. Делиться древом с родными вы решите сами.', '', ''],
    mom: 'мама', dad: 'папа', fam: 'семейное древо', people: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'человек' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'человека' : 'человек'}`,
  },
  en: {
    eyebrow: 'Your tree', title: 'Let’s begin', of: 'of', next: 'Next', back: 'Back', create: 'Create the tree', preview: 'preview of your tree',
    s1: ['Choose a style for the tree', 'This is the background your family will grow on. You can change it any time.'],
    s2: ['What is your surname?', 'It becomes the name of your tree.', 'Surname', 'For example, Smith'],
    s3: ['What is your name?', 'The tree starts with you. We will add the rest of the family step by step.', 'First name', 'Your name'],
    s4: ['Tell us a little about yourself', 'We use this to pick a portrait for your card until there is a photo.', 'Gender', ['Female', 'Male', 'Prefer not to say'], 'Date of birth', 'DD.MM.YYYY', 'City', 'Where you were born', 'If you don’t have the exact date, the year is enough.'],
    s5: ['What are your parents’ names?', 'We will add them above you. Leave a field empty if you don’t know.', 'Mother', 'Father', 'First name', 'Surname'],
    calm: ['Everything you enter is visible only to you and stays on this device.', 'A maiden name and other spellings can be added later in the profile.', 'Only you can see this. You decide whether to share the tree.', '', ''],
    mom: 'mother', dad: 'father', fam: 'family tree', people: n => `${n} ${n === 1 ? 'person' : 'people'}`,
  },
}
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const yearOf = v => { const m = String(v || '').match(/\d{4}/); return m ? +m[0] : 0 }
const fit = (v, n) => (v.length > n ? v.slice(0, n - 1) + '…' : v)
const ico = {
  back: '<svg class="ico" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
}

function portrait(gender, birthY, salt) {
  const list = PRESET_TYPES[presetType({ gender, birthDate: birthY ? String(birthY) : '' })]
  return PRESET_SRC[list[salt % list.length]]
}

export function mount(root, opts) {
  const lang = opts.lang === 'en' ? 'en' : 'ru', T = TXT[lang]
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const S = { theme: 'night', last: '', first: '', gender: null, birth: '', place: '', mom: { first: '', last: '' }, dad: { first: '', last: '' }, step: 0 }
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)]

  root.innerHTML = `<div class="fr-veil"><div class="fr-dlg" role="dialog" aria-modal="true" aria-labelledby="frTitle">
    <form class="fr-form" autocomplete="off" novalidate>
      <div class="fr-head"><span class="fr-eyebrow">${T.eyebrow}</span><h1 id="frTitle">${T.title}</h1><div class="fr-bars" aria-hidden="true">${'<i></i>'.repeat(5)}</div></div>
      <div class="fr-steps">
        <section class="fr-step" data-s="0"><span class="n">1 ${T.of} 5</span><h2>${T.s1[0]}</h2><p class="hint">${T.s1[1]}</p>
          <div class="fr-swatches" role="radiogroup" aria-label="${T.s1[0]}">${THEMES.map(t => `<button type="button" class="fr-sw" role="radio" aria-checked="${t.k === S.theme}" data-k="${t.k}"><span class="chip th-${t.k}"></span>${esc(themeName(t))}</button>`).join('')}</div></section>
        <section class="fr-step" data-s="1"><span class="n">2 ${T.of} 5</span><h2>${T.s2[0]}</h2><p class="hint">${T.s2[1]}</p>
          <div class="fr-field"><label for="frLast">${T.s2[2]}</label><input id="frLast" type="text" placeholder="${T.s2[3]}"></div></section>
        <section class="fr-step" data-s="2"><span class="n">3 ${T.of} 5</span><h2>${T.s3[0]}</h2><p class="hint">${T.s3[1]}</p>
          <div class="fr-field"><label for="frFirst">${T.s3[2]}</label><input id="frFirst" type="text" placeholder="${T.s3[3]}"></div></section>
        <section class="fr-step" data-s="3"><span class="n">4 ${T.of} 5</span><h2>${T.s4[0]}</h2><p class="hint">${T.s4[1]}</p>
          <div class="fr-field"><label id="frGl">${T.s4[2]}</label><div class="fr-seg" role="radiogroup" aria-labelledby="frGl">
            ${[['f', 0], ['m', 1], ['', 2]].map(([g, i]) => `<button type="button" role="radio" aria-checked="false" data-g="${g}">${T.s4[3][i]}</button>`).join('')}</div></div>
          <div class="fr-reveal"><div class="fr-row2">
            <div class="fr-field"><label for="frBirth">${T.s4[4]}</label><input id="frBirth" type="text" inputmode="numeric" maxlength="10" placeholder="${T.s4[5]}"></div>
            <div class="fr-field"><label for="frPlace">${T.s4[6]}</label><input id="frPlace" type="text" list="frCities" placeholder="${T.s4[7]}"></div></div>
            <p class="hint small">${T.s4[8]}</p></div></section>
        <section class="fr-step" data-s="4"><span class="n">5 ${T.of} 5</span><h2>${T.s5[0]}</h2><p class="hint">${T.s5[1]}</p>
          ${[['Mom', T.s5[2]], ['Dad', T.s5[3]]].map(([w, l]) => `<div class="fr-parent"><b>${l}</b>
            <div class="fr-field"><label for="fr${w}First" class="sr">${l}, ${T.s5[4]}</label><input id="fr${w}First" type="text" placeholder="${T.s5[4]}"></div>
            <div class="fr-field"><label for="fr${w}Last" class="sr">${l}, ${T.s5[5]}</label><input id="fr${w}Last" type="text" placeholder="${T.s5[5]}"></div></div>`).join('')}</section>
      </div>
      <div class="fr-calm">${ico.lock}<span></span></div>
      <div class="fr-foot"><button type="button" class="btn ghost fr-back">${ico.back}${T.back}</button><span class="grow"></span><span class="kbd">Enter ↵</span><button type="submit" class="btn primary fr-next">${T.next}</button></div>
    </form>
    <div class="fr-preview"><div class="fr-scene th-night"><canvas class="fog"></canvas><div class="stage"></div></div></div>
  </div></div><datalist id="frCities">${(opts.cities || []).map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>`

  // ---- preview tree
  const NW = 220, NH = 80
  const POS = { gp: [[-345, -220], [-155, -220], [155, -220], [345, -220]], mom: [-135, -50], dad: [135, -50], me: [0, 130] }
  const SEEN = {}; const popped = (k, on) => { const was = SEEN[k]; SEEN[k] = on; return on && !was ? ' pop' : '' }
  const slot = (cls, x, y, inner, small) => { const w = small ? 150 : NW, h = small ? 52 : NH
    return `<g class="slot ${cls}" transform="translate(${x - w / 2} ${y - h / 2})"><rect class="box" width="${w}" height="${h}" rx="18"/><g class="content">${inner || ''}</g></g>` }
  const person = (first, last, sub, img, k) => { const lines = [first, last].filter(Boolean).map(v => fit(v, 15)); const top = sub ? 26 : 34
    return `<clipPath id="frc${k}"><circle cx="40" cy="40" r="26"/></clipPath><image href="${img}" x="14" y="14" width="52" height="52" clip-path="url(#frc${k})" preserveAspectRatio="xMidYMid slice"/><circle class="ring" cx="40" cy="40" r="26"/>
      ${lines.map((l, i) => `<text class="nm" x="78" y="${top + i * 18}"${i ? ' style="font-weight:500"' : ''}>${esc(l)}</text>`).join('')}${sub ? `<text class="sb" x="78" y="${top + lines.length * 18 + 2}">${esc(fit(sub, 22))}</text>` : ''}` }
  function treeSVG() {
    const by = yearOf(S.birth), pY = by ? by - 27 : 0   // parents' age is only a guess for the portrait, never saved
    const hasMe = !!S.first, hasMom = !!S.mom.first, hasDad = !!S.dad.first
    const [mx, my] = POS.me, [ax, ay] = POS.mom, [bx, by2] = POS.dad, cx = (ax + bx) / 2, g = POS.gp
    let h = ''
    g.forEach(([x, y]) => { h += slot('ghost', x, y, '', true) })
    h += `<path class="lk ghost" d="M${g[0][0] + 75} ${g[0][1]}H${g[1][0] - 75}M${g[2][0] + 75} ${g[2][1]}H${g[3][0] - 75}"/>`
    h += `<path class="lk ghost" d="M${(g[0][0] + g[1][0]) / 2} ${g[0][1]}V${ay - 70}C${(g[0][0] + g[1][0]) / 2} ${ay - 50} ${ax} ${ay - 60} ${ax} ${ay - NH / 2}"/>`
    h += `<path class="lk ghost" d="M${(g[2][0] + g[3][0]) / 2} ${g[2][1]}V${by2 - 70}C${(g[2][0] + g[3][0]) / 2} ${by2 - 50} ${bx} ${by2 - 60} ${bx} ${by2 - NH / 2}"/>`
    h += `<path class="lk ${hasMom && hasDad ? 'on' : ''}" d="M${ax + NW / 2} ${ay}H${bx - NW / 2}"/>`
    h += `<path class="lk ${(hasMom || hasDad) && hasMe ? 'on' : ''}" d="M${cx} ${ay}V${ay + 50}C${cx} ${my - 80} ${mx} ${my - 90} ${mx} ${my - NH / 2}"/>`
    h += slot((hasMom ? 'filled' : '') + popped('m', hasMom), ax, ay, hasMom ? person(S.mom.first, S.mom.last, T.mom, portrait('f', pY, 2), 'm') : '')
    h += slot((hasDad ? 'filled' : '') + popped('d', hasDad), bx, by2, hasDad ? person(S.dad.first, S.dad.last, T.dad, portrait('m', pY, 0), 'd') : '')
    h += slot('me' + (hasMe ? ' filled' : '') + popped('y', hasMe), mx, my, hasMe ? person(S.first, cap(S.last), [by || '', S.place].filter(Boolean).join(' · '), portrait(S.gender, by, 1), 'y') : '')
    return `<svg class="tree" viewBox="-440 -260 880 460">${h}</svg>`
  }
  const progress = () => { let p = .08; if (S.step > 0) p += .14; if (S.last) p += .14; if (S.first) p += .18; if (S.gender !== null) p += .08; if (S.birth) p += .07; if (S.place) p += .05; if (S.mom.first) p += .13; if (S.dad.first) p += .13; return Math.min(1, p) }
  const scene = $('.fr-scene'), fog = mountFog(scene.querySelector('canvas'))
  function render() {
    scene.className = 'fr-scene th-' + S.theme
    const fam = familyTitle(S.last), n = (S.first ? 1 : 0) + (S.mom.first ? 1 : 0) + (S.dad.first ? 1 : 0)
    scene.querySelector('.stage').innerHTML = `<div class="fam-title${fam ? '' : ' empty'}${popped('t', !!fam)}"><small>${n ? T.people(n) : T.fam}</small><h1>${esc(fam) || '&nbsp;'}</h1></div>${treeSVG()}`
    fog.color = themeOf(S.theme).fog; fog.target = 1 - progress() * .88
    opts.onTheme && opts.onTheme(S.theme)
  }

  // ---- steps
  const valid = i => (i === 1 ? !!S.last : i === 2 ? !!S.first : i === 3 ? S.gender !== null : true)
  const update = () => { $('.fr-next').disabled = !valid(S.step) }
  function show(i) {
    S.step = i
    $$('.fr-step').forEach(s => { const k = +s.dataset.s; s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); s.inert = k !== i })
    $$('.fr-bars i').forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.toggle('cur', k === i) })
    $('.fr-back').style.visibility = i ? 'visible' : 'hidden'
    $('.fr-next').textContent = i === 4 ? T.create : T.next
    $('.fr-calm span').textContent = T.calm[i]; $('.fr-calm').hidden = !T.calm[i]
    if (i === 4) {
      const m = lang === 'ru' ? mascSurname(cap(S.last)) : cap(S.last)
      if (!$('#frDadLast').value) { $('#frDadLast').value = m; S.dad.last = m }
      if (!$('#frMomLast').value) { $('#frMomLast').value = lang === 'ru' ? femSurname(m) : m; S.mom.last = $('#frMomLast').value }
    }
    update(); render()
    const f = root.querySelector(`.fr-step[data-s="${i}"] input, .fr-step[data-s="${i}"] [aria-checked="true"], .fr-step[data-s="${i}"] button`)
    setTimeout(() => f && f.focus({ preventScroll: true }), reduce ? 0 : 320)
  }
  $$('.fr-sw').forEach(b => b.addEventListener('click', () => { S.theme = b.dataset.k; $$('.fr-sw').forEach(x => x.setAttribute('aria-checked', String(x === b))); render() }))
  const bind = (sel, fn) => $(sel).addEventListener('input', e => { fn(e.target.value.trim()); update(); render() })
  bind('#frLast', v => S.last = v); bind('#frFirst', v => S.first = cap(v)); bind('#frPlace', v => S.place = v)
  bind('#frMomFirst', v => S.mom.first = cap(v)); bind('#frMomLast', v => S.mom.last = v)
  bind('#frDadFirst', v => S.dad.first = cap(v)); bind('#frDadLast', v => S.dad.last = v)
  $('#frBirth').addEventListener('input', e => {   // digits only, dots appear by themselves
    const g = e.target.value.replace(/\D/g, '').slice(0, 8)
    e.target.value = g.length > 4 ? `${g.slice(0, 2)}.${g.slice(2, 4)}.${g.slice(4)}` : g.length > 2 ? `${g.slice(0, 2)}.${g.slice(2)}` : g
    S.birth = /^\d{4}$/.test(g) ? g : g.length === 8 ? e.target.value : ''; render()
  })
  $$('.fr-seg button').forEach(b => b.addEventListener('click', () => {
    S.gender = b.dataset.g; $$('.fr-seg button').forEach(x => x.setAttribute('aria-checked', String(x === b)))
    $('.fr-reveal').classList.add('on'); update(); render()
  }))
  $('.fr-back').addEventListener('click', () => { if (S.step) show(S.step - 1) })
  $('.fr-form').addEventListener('submit', e => {
    e.preventDefault(); if (!valid(S.step)) return
    if (S.step < 4) { show(S.step + 1); return }
    $('.fr-veil').classList.add('out')
    setTimeout(() => opts.onDone({ theme: S.theme, familyName: familyTitle(S.last), me: { first: S.first, last: cap(S.last), gender: S.gender || '', birthDate: S.birth, birthPlace: S.place }, mom: S.mom, dad: S.dad }), reduce ? 0 : 600)
  })
  show(0)
  return () => { fog.destroy(); root.innerHTML = '' }
}
export const FirstRun = { mount }
