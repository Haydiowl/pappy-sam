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
document.querySelectorAll('.faq-list details').forEach(item => item.addEventListener('toggle', () => {
  if (item.open) document.querySelectorAll('.faq-list details').forEach(other => { if (other !== item) other.open = false; });
}));
document.querySelector('#contact-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const status = event.currentTarget.querySelector('.form-status');
  status.textContent = 'Thank you — your message is ready to send.';
  status.classList.add('show');
  event.currentTarget.reset();
});
