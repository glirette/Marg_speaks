/* Progressive enhancement: articles, citations and navigation need no JavaScript. */
for (const list of document.querySelectorAll('[data-filter-list]')) {
  const bar = list.querySelector('.filter-bar');
  const buttons = [...bar.querySelectorAll('[data-filter]')];
  const input = bar.querySelector('input');
  const rows = [...list.querySelectorAll('[data-category]')];
  const count = list.querySelector('.result-count');
  const empty = list.querySelector('.empty-state');
  let category = 'all';
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function update() {
    const query = normalize(input.value);
    let shown = 0;
    for (const row of rows) {
      row.hidden = !((category === 'all' || row.dataset.category === category) && normalize(row.textContent).includes(query));
      if (!row.hidden) shown++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    count.textContent = `${shown} of ${rows.length} ${list.querySelector('.timeline') ? 'events' : 'sources'} shown`;
    empty.hidden = shown !== 0;
  }
  for (const button of buttons) button.addEventListener('click', () => { category = button.dataset.filter; update(); });
  input.addEventListener('input', update);
  list.querySelector('.reset-filters').addEventListener('click', () => { category = 'all'; input.value = ''; update(); input.focus(); });
  // A source citation with a fragment must reveal its target even after filtering.
  function revealFragment() {
    const target = rows.find(row => `#${row.id}` === window.location.hash);
    if (target) {category = 'all'; input.value = ''; update(); target.scrollIntoView();}
    else update();
  }
  window.addEventListener('hashchange', revealFragment);
  // Re-entering the same fragment fires popstate without a hashchange.
  window.addEventListener('popstate', revealFragment);
  // History navigation can restore input values after this script first runs.
  window.addEventListener('pageshow', update);
  bar.hidden = false;
  count.hidden = false;
  update();
}
for (const button of document.querySelectorAll('.print-button')) {
  button.hidden = false;
  button.addEventListener('click', () => window.print());
}
