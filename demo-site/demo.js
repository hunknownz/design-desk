const pageId = new URLSearchParams(location.search).get('page') || 'home';
const pages = {
  home: ['Website review without email chains', 'Collect precise comments directly on the page preview.'],
  products: ['A clear sample catalog', 'Review hierarchy, labels, cards, and calls to action at every viewport.'],
  about: ['A neutral company story', 'This fixture intentionally contains no customer brand or project information.']
};
const [title, summary] = pages[pageId] || pages.home;
document.querySelector('#page-content').innerHTML = `
  <section class="hero" data-review-target="hero" data-review-label="Hero section">
    <span class="eyebrow">${pageId}</span>
    <h1>${title}</h1>
    <p>${summary}</p>
  </section>
  <section class="cards" data-review-target="content-cards" data-review-label="Content cards">
    <article><h2>Structure</h2><p>Review information architecture and navigation.</p></article>
    <article><h2>Context</h2><p>Select an element or draw an area to leave feedback.</p></article>
    <article id="contact"><h2>Decision</h2><p>Resolve and archive comments when a decision is made.</p></article>
  </section>`;

document.querySelectorAll('[data-page]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    parent.postMessage({ type: 'design-desk:page-change', pageId: link.dataset.page }, '*');
  });
});
