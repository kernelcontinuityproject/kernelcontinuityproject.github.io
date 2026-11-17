const INDEX_URL = '../index.kcpi';
const PHOTOS_DIR = '../devices/photos/';

const isEmpty = v => v === undefined || v === '' || /^null$/i.test(v);
const isYes = v => /^(yes|true|1)$/i.test((v || '').trim());

function parseKcpi(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const h = line.match(/^\[([^\]]+)\]$/);
    if (h) { cur = { id: h[1].trim() }; out.push(cur); continue; }
    const i = line.indexOf(':');
    if (i < 0 || !cur) continue;
    cur[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  for (const k of kids) e.append(k);
  return e;
}

function row(dl, label, value) {
  if (isEmpty(value)) return;
  dl.append(el('dt', { textContent: label }), el('dd', {}, value instanceof Node ? value : document.createTextNode(value)));
}

function card(t) {
  const generic = isYes(t.is_generic);
  const top = el('div', { className: 'top' });

  // foto só em alvo não-genérico, e só se o arquivo existir
  if (!generic && !isEmpty(t.photo)) {
    const img = new Image();
    img.alt = t.device || t.id;
    img.onload = () => top.prepend(img);
    img.src = PHOTOS_DIR + encodeURIComponent(t.photo);
  }

  const title = generic ? t.id : (t.device || t.id);
  const h3 = el('h3', { textContent: title });
  if (generic) h3.append(el('span', { className: 'tag', textContent: 'genérico' }));
  const head = el('div', {}, h3);
  if (!generic && !isEmpty(t.vendor)) head.append(el('div', { className: 'vendor', textContent: t.vendor }));
  top.append(head);

  const dl = el('dl');
  row(dl, 'kernelrelease', isEmpty(t.kernelrelease) ? null : el('code', { textContent: t.kernelrelease }));
  row(dl, 'patches', t.patches);
  row(dl, 'arch', t.arch);
  if (!isEmpty(t.source)) {
    row(dl, 'source', el('a', { href: 'https://github.com/' + t.source, textContent: t.source }));
  }

  const c = el('div', { className: 'card' }, top, dl);
  if (!isEmpty(t.download) && /^https?:\/\//i.test(t.download)) {
    c.append(el('a', { className: 'btn', href: t.download, textContent: 'download' }));
  }
  return c;
}

async function main() {
  const list = document.getElementById('list');
  try {
    const r = await fetch(INDEX_URL, { cache: 'no-cache' });
    if (!r.ok) throw new Error('http ' + r.status);
    const targets = parseKcpi(await r.text());
    list.replaceChildren();
    if (!targets.length) { list.append(el('p', { className: 'mut', textContent: 'nenhum alvo no index.kcpi.' })); return; }
    for (const t of targets) list.append(card(t));
  } catch (e) {
    list.replaceChildren(el('p', { className: 'mut', textContent: 'não deu pra carregar o index.kcpi (' + e.message + '). precisa servir por http, não abrir como file://.' }));
  }
}
main();
