import { directions, type ServiceNeed } from '@/data/services';
import products from '@/data/products.json';
import { STUDIO_EMAIL } from '@/consts';

const root = document.querySelector<HTMLElement>('#work-together');
if (root) {
  function element<T extends HTMLElement>(selector: string): T {
    const match = root!.querySelector<T>(selector);
    if (!match) throw new Error(`Missing enquiry control: ${selector}`);
    return match;
  }
  const chooser = element('#chooser');
  const panels = root.querySelectorAll<HTMLElement>('[data-step]');
  const context = element<HTMLTextAreaElement>('#context');
  const nonprofit = element<HTMLInputElement>('#nonprofit');
  const briefText = element<HTMLTextAreaElement>('#brief-text');
  const email = element<HTMLAnchorElement>('#email-enquiry');
  const params = new URLSearchParams(location.search);
  const requested = params.get('need');
  let need: ServiceNeed | undefined =
    requested && Object.hasOwn(directions, requested) ? (requested as ServiceNeed) : undefined;
  let step = need ? (need === 'product' ? 3 : 2) : 1;
  let briefOpen = false;
  let briefSource = '';
  nonprofit.checked = params.get('nonprofit') === '1';

  function updateEmail() {
    email.href = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent('Working with Hypertext Studio')}&body=${encodeURIComponent(briefText.value)}`;
  }

  function render(focus = false) {
    panels.forEach((panel) => (panel.hidden = Number(panel.dataset.step) !== step));
    const product = need === 'product';
    element('#progress').textContent =
      `Step ${product && step === 3 ? 2 : step} of ${product ? 2 : 3}`;
    element<HTMLButtonElement>('#first-next').disabled = !need;
    root!
      .querySelectorAll<HTMLInputElement>('input[name="need"]')
      .forEach((input) => (input.checked = input.value === need));
    element('#nonprofit-note').hidden = !nonprofit.checked;
    element('#result').hidden = briefOpen;
    element('#brief').hidden = !briefOpen;
    if (need) {
      const direction = directions[need];
      element('#work-title').textContent = briefOpen
        ? 'Start a conversation.'
        : step === 3
          ? direction.title
          : step === 2
            ? 'What should I know?'
            : 'What do you need help with?';
      element('#result-description').textContent = direction.description;
      element('#result-items').replaceChildren(
        ...(product
          ? products.map(({ name, tagline, url }) => ({ text: `${name} — ${tagline}`, href: url }))
          : direction.items.map((text) => ({ text, href: undefined }))
        ).map(({ text, href }) => {
          const li = document.createElement('li');
          if (href) {
            const link = document.createElement('a');
            link.href = href;
            link.textContent = text;
            link.rel = 'external noopener';
            li.append(link);
          } else li.textContent = text;
          return li;
        }),
      );
      element('#prepare').hidden = product;
      element('#result-note').hidden = product;
      element('#reduced').hidden = product || !nonprofit.checked;
    }
    if (!need) element('#work-title').textContent = 'What do you need help with?';
    if (focus) {
      element('#work-title').focus();
      root!.scrollIntoView({ block: 'start' });
    }
  }

  function advance(next: number) {
    step = next;
    briefOpen = false;
    render(true);
  }
  root.querySelectorAll<HTMLInputElement>('input[name="need"]').forEach((input) =>
    input.addEventListener('change', () => {
      need = input.value as ServiceNeed;
      render();
    }),
  );
  element('#first-next').addEventListener('click', () => {
    if (need) advance(need === 'product' ? 3 : 2);
  });
  element('#second-next').addEventListener('click', () => advance(3));
  root.querySelectorAll('[data-back]').forEach((button) =>
    button.addEventListener('click', () => {
      if (briefOpen) {
        briefOpen = false;
        render(true);
      } else advance(step === 3 && need === 'product' ? 1 : Math.max(1, step - 1));
    }),
  );
  nonprofit.addEventListener('change', () => render());
  element('#prepare').addEventListener('click', () => {
    if (!need || need === 'product') return;
    const labels = {
      consult: 'a product or technical decision',
      redesign: 'redesigning existing software',
      ai: 'where AI could help my product',
      build: 'a custom website, app, or platform',
      unsure: 'a situation I’m still working through',
    };
    const source = JSON.stringify([need, context.value, nonprofit.checked]);
    // Back preserves an edited enquiry. Changed answers produce a fresh draft.
    if (source !== briefSource) {
      briefText.value = `I’d like help with ${labels[need]}.\n\n${context.value.trim() || 'Here is the situation: '}\n\n${nonprofit.checked ? 'This is for a nonprofit, community project, or social cause. I’d like to discuss reduced rates.\n\n' : ''}I’d like to understand the next useful step and what working together would involve.`;
      briefSource = source;
    }
    element('#copy-status').textContent = '';
    updateEmail();
    briefOpen = true;
    render(true);
  });
  briefText.addEventListener('input', () => {
    updateEmail();
    element('#copy-status').textContent = '';
  });
  element('#copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(briefText.value);
      element('#copy-status').textContent = 'Your enquiry is copied.';
    } catch {
      briefText.focus();
      briefText.select();
      element('#copy-status').textContent =
        'Your enquiry is selected. Use your device’s copy command.';
    }
  });
  element('#progress').hidden = false;
  chooser.hidden = false;
  render();
}
