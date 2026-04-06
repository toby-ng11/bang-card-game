import { CARD_DEFS } from '@/definitions/cards';
import { CardKey } from '@/types';

function showBanner(text: string, duration = 1100): Promise<void> {
    const b = document.getElementById('action-banner');
    if (!b) return Promise.resolve();
    b.textContent = text;
    b.style.opacity = '1';
    return new Promise((res) =>
        setTimeout(() => {
            b.style.opacity = '0';
            setTimeout(res, 200);
        }, duration),
    );
}

function popupOnPlayer(
    pid: number,
    cardKey: CardKey,
    variant: string,
): Promise<void> {
    const row = document.querySelector(`[data-pid="${pid}"]`) as HTMLDivElement;
    if (!row) return Promise.resolve();
    const c = CARD_DEFS[cardKey];
    const el = document.createElement('div');
    el.className = `popup-card ${variant}`;
    el.innerHTML = `
    <span style="font-size:22px;">${c ? c.icon : '?'}</span>
    <span style="font-size:9px;margin-top:2px;">${c ? c.name : ''}</span>
  `;
    row.appendChild(el);
    requestAnimationFrame(() =>
        requestAnimationFrame(() => el.classList.add('show')),
    );
    return new Promise<void>((res) =>
        setTimeout(() => {
            el.remove();
            res();
        }, 1100),
    );
}

function getPlayerEl(id: number): HTMLDivElement {
    return document.querySelector(`[data-pid="${id}"]`) as HTMLDivElement;
}

function floatCard(
    cardKey: CardKey,
    fromEl: HTMLDivElement,
    toEl: HTMLDivElement,
): Promise<void> {
    const fc = document.getElementById('float-card');
    const fiEl = fc?.querySelector('.fi');
    const fnEl = document.getElementById('fc-name');
    if (!fc || !fromEl || !toEl) return Promise.resolve();

    const c = CARD_DEFS[cardKey];
    if (fiEl) fiEl.textContent = c ? c.icon : '?';
    if (fnEl) fnEl.textContent = c ? c.name : '';

    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();
    const sx = fr.left + fr.width / 2 - 26;
    const sy = fr.top + fr.height / 2 - 36;
    const ex = tr.left + tr.width / 2 - 26;
    const ey = tr.top + tr.height / 2 - 36;

    fc.style.transition = 'none';
    fc.style.left = `${sx}px`;
    fc.style.top = `${sy}px`;
    fc.style.opacity = '1';
    fc.style.transform = 'scale(1)';

    return new Promise((res) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fc.style.transition = [
                    'left 0.5s cubic-bezier(0.4,0,0.2,1)',
                    'top 0.5s cubic-bezier(0.4,0,0.2,1)',
                    'opacity 0.3s 0.3s',
                    'transform 0.5s',
                ].join(',');
                fc.style.left = `${ex}px`;
                fc.style.top = `${ey}px`;
                fc.style.opacity = '0';
                fc.style.transform = 'scale(0.7)';
                setTimeout(res, 650);
            });
        });
    });
}

function wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export { floatCard, getPlayerEl, popupOnPlayer, showBanner, wait };
