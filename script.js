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

const testimonials = [
  { topic: 'Psychology & Well-being', text: 'Samuel created a space that felt safe, thoughtful, and genuinely supportive. I left each session with a clearer sense of myself and what I needed to do next.', label: 'Therapy Client' },
  { topic: 'Community Development', text: 'Working together was a truly collaborative experience. His ability to listen, understand different perspectives, and create meaningful solutions made a lasting impact', label: 'Community Programme Partner' },
  { topic: 'Professional Training & Workshops', text: 'The session was engaging, informative, and immediately practical. Our team left with valuable insights that we could apply straight away', label: 'Workshop Participant' },
  { topic: 'Individual Therapy', text: 'A compassionate approach that helped me understand patterns in my relationships. The sessions gave me tools I still use today to communicate more effectively with my partner.', label: 'Couple' },
  { topic: 'Group Therapy', text: 'Hearing others share similar struggles reminded me I was not alone. The group format provided both support and diverse perspectives that accelerated my growth.', label: 'Group Participant' },
  { topic: 'Farm Advisory', text: 'The practical guidance on crop rotation and soil health made a noticeable difference in my yield. Finally, some advice that works with nature rather than against it.', label: 'Agricultural Client' },
  { topic: 'Agribusiness Strategy', text: 'Helped me clarify my farm\'s long-term vision and identify the key bottlenecks holding back growth. Highly practical and tailored to my specific situation.', label: 'Farm/Business Client' },
  { topic: 'Ministry Development', text: 'The mentorship and spiritual guidance provided clarity during a season of uncertainty. I feel more confident leading my community now.', label: 'Ministry Participant' },
  { topic: 'Relationship Counselling', text: 'A safe space to explore difficult dynamics with my partner. The sessions improved our communication and helped us reconnect on a deeper level.', label: 'Therapy Client' }
];

const testimonialTrack = document.querySelector('[data-testimonial-track]');
if (testimonialTrack) {
  testimonialTrack.innerHTML = testimonials.map(review => review.pending
    ? '<figure class="is-pending" aria-label="Reserved for an approved testimonial"><div aria-hidden="true">“</div><h3 aria-hidden="true"></h3><blockquote aria-hidden="true"></blockquote><figcaption aria-hidden="true"></figcaption></figure>'
    : `<figure><div aria-hidden="true">“</div><h3>${review.topic}</h3><blockquote>${review.text}</blockquote><figcaption>— ${review.label}</figcaption></figure>`).join('');
  document.querySelectorAll('[data-testimonial-direction]').forEach(control => control.addEventListener('click', () => {
    const amount = testimonialTrack.clientWidth * .86;
    const direction = control.dataset.testimonialDirection === 'next' ? 1 : -1;
    testimonialTrack.scrollBy({ left: amount * direction, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
}

const setFormStatus = (form, message, isError = false) => {
  const status = form.querySelector('.form-status');
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.classList.add('show');
};

const updateAvailableTimes = async form => {
  const date = form.elements.date?.value;
  const duration = form.elements.duration?.value;
  const time = form.elements.time;
  if (!date || !duration || !time) return;
  time.disabled = true;
  time.innerHTML = '<option value="">Loading available times…</option>';
  try {
    const response = await fetch(`/api/availability?service=${encodeURIComponent(form.dataset.serviceForm)}&date=${encodeURIComponent(date)}&duration=${encodeURIComponent(duration)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Availability could not be loaded.');
    time.innerHTML = `<option value="">Select an available time</option>${data.slots.map(slot => `<option value="${slot.value}">${slot.label}</option>`).join('')}`;
    time.disabled = data.slots.length === 0;
    if (!data.slots.length) setFormStatus(form, 'There are no available times for this date. Please choose another date.', true);
  } catch (error) {
    time.innerHTML = '<option value="">Availability unavailable</option>';
    setFormStatus(form, error.message || 'Availability could not be loaded. Please try again later.', true);
  }
};

const selectContactTab = tab => {
  const selected = tab.dataset.contactTab;
  document.querySelectorAll('[data-contact-tab]').forEach(button => {
    const active = button === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-service-form]').forEach(form => {
    const active = form.dataset.serviceForm === selected;
    form.hidden = !active;
    form.classList.toggle('active', active);
  });
};

document.querySelectorAll('[data-contact-tab]').forEach(tab => tab.addEventListener('click', () => selectContactTab(tab)));

document.querySelectorAll('[data-service-form]').forEach(form => {
  form.querySelectorAll('input, select, textarea').forEach(field => {
    const updateFieldLabel = () => field.closest('label')?.classList.toggle('is-filled', Boolean(field.value));
    field.addEventListener('input', updateFieldLabel);
    field.addEventListener('change', updateFieldLabel);
    updateFieldLabel();
  });
  form.elements.date?.addEventListener('change', () => updateAvailableTimes(form));
  form.elements.duration?.addEventListener('change', () => updateAvailableTimes(form));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const service = form.dataset.serviceForm;
    const email = form.elements.email?.value.trim();
    const phone = form.elements.phone?.value.trim();
    if (!form.reportValidity()) return;
    if (service === 'ministry') {
      const invitation = window.open('https://chat.whatsapp.com/EdtZ5f5XWzYF4LNjFk6TmS?s=cl&p=a&mlu=4&ilr=4', '_blank', 'noopener,noreferrer');
      if (invitation) invitation.opener = null;
      setFormStatus(form, 'The WhatsApp invitation has been opened in a new tab.');
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Checking availability…';
    try {
      const response = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service, fullName: form.elements.fullName.value.trim(), email, phone, organisation: form.elements.organisation?.value.trim(), location: form.elements.location?.value.trim(), supportType: form.elements.supportType.value, date: form.elements.date.value, time: form.elements.time.value, duration: Number(form.elements.duration.value), meetingFormat: form.elements.meetingFormat.value, message: form.elements.message.value.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Your booking could not be created. Please try another time.');
      setFormStatus(form, `Booking confirmed. Reference: ${data.reference}.`);
      form.reset();
      form.elements.time.disabled = true;
      form.elements.time.innerHTML = '<option value="">Choose a date first</option>';
    } catch (error) {
      setFormStatus(form, error.message || 'Your booking could not be created. Please try again.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = service === 'therapy' ? 'Book a Session' : 'Schedule an Appointment';
    }
  });
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

const enableSectionReveals = () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  const sectionSelectors = [
    '.nav',
    '.hero-copy',
    '.hero-art',
    '.heading',
    '.about-heading',
    '.expertise-heading',
    '.stats > article',
    '.about-portrait',
    '.about-accordion',
    '.expertise-tabs',
    '.expertise-panel article',
    '.process-cards article',
    '.faq-intro',
    '.faq-list details',
    '.contact-panel',
    '.contact-copy',
    '.quote-grid figure',
    '.footer-top > *',
    '.footer-bottom'
  ];
  const sections = [...document.querySelectorAll('.hero, main > section, footer')];
  const targets = [];

  sections.forEach(section => {
    const sectionTargets = [...new Set(sectionSelectors.flatMap(selector => [...section.querySelectorAll(selector)]))];
    sectionTargets.forEach((target, index) => {
      target.classList.add('reveal-item');
      target.style.setProperty('--reveal-delay', `${Math.min(index * 65, 390)}ms`);
      targets.push(target);
    });
  });

  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  targets.forEach(target => observer.observe(target));
};

enableSectionReveals();
