const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu-button');
menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menu.textContent = open ? '×' : '☰';
});
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.textContent = '☰';
}));
const keepNextAccordionOpen = selector => {
  const accordions = [...document.querySelectorAll(selector)];
  accordions.forEach((item, index) => item.addEventListener('toggle', () => {
    if (item.open) {
      accordions.forEach(other => {
        if (other !== item) other.open = false;
      });
      return;
    }

    if (!accordions.some(other => other.open)) {
      accordions[(index + 1) % accordions.length].open = true;
    }
  }));
};

keepNextAccordionOpen('.faq-list details');
document.querySelector('#contact-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const status = event.currentTarget.querySelector('.form-status');
  status.textContent = 'Thank you — your message is ready to send.';
  status.classList.add('show');
  event.currentTarget.reset();
});

const selectExpertiseTab = tab => {
  const selected = tab.dataset.expertiseTab;
  document.querySelectorAll('[data-expertise-tab]').forEach(button => {
    const active = button === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-expertise-panel]').forEach(panel => {
    const active = panel.dataset.expertisePanel === selected;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
};
document.querySelectorAll('[data-expertise-tab]').forEach(tab => {
  tab.addEventListener('click', () => selectExpertiseTab(tab));
  tab.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectExpertiseTab(tab);
    }
  });
});

keepNextAccordionOpen('.about-accordion');
