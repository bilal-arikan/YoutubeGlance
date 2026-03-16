/**
 * Button Styling Module
 *
 * Creates a YouTube-native looking player button with SVG icon.
 * Matches the style of built-in controls (CC, settings, fullscreen).
 *
 * Icon: Document with text lines + AI sparkle (glance concept)
 */

const BUTTON_ID = 'yt-glance-btn';

/**
 * Create SVG icon using DOM API (avoids Trusted Types CSP violation on YouTube).
 * Design: Document with 3 text lines + AI sparkle in top-right
 */
function createIconSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '2 0 23 24');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '26');

  // Document body (rounded rect outline)
  const doc = document.createElementNS(ns, 'path');
  doc.setAttribute('d', 'M4 3.5C4 2.67 4.67 2 5.5 2h9C15.33 2 16 2.67 16 3.5v17c0 .83-.67 1.5-1.5 1.5h-9C4.67 22 4 21.33 4 20.5V3.5zm1.5.5v16h9V4h-9z');
  doc.setAttribute('fill', 'currentColor');
  svg.appendChild(doc);

  // Text line 1
  const line1 = document.createElementNS(ns, 'rect');
  line1.setAttribute('x', '7'); line1.setAttribute('y', '7.5');
  line1.setAttribute('width', '6.5'); line1.setAttribute('height', '1.5');
  line1.setAttribute('rx', '0.75');
  line1.setAttribute('fill', 'currentColor');
  line1.setAttribute('opacity', '0.7');
  svg.appendChild(line1);

  // Text line 2
  const line2 = document.createElementNS(ns, 'rect');
  line2.setAttribute('x', '7'); line2.setAttribute('y', '11');
  line2.setAttribute('width', '5'); line2.setAttribute('height', '1.5');
  line2.setAttribute('rx', '0.75');
  line2.setAttribute('fill', 'currentColor');
  line2.setAttribute('opacity', '0.55');
  svg.appendChild(line2);

  // Text line 3
  const line3 = document.createElementNS(ns, 'rect');
  line3.setAttribute('x', '7'); line3.setAttribute('y', '14.5');
  line3.setAttribute('width', '4'); line3.setAttribute('height', '1.5');
  line3.setAttribute('rx', '0.75');
  line3.setAttribute('fill', 'currentColor');
  line3.setAttribute('opacity', '0.4');
  svg.appendChild(line3);

  // AI Sparkle (4-point star, top-right)
  const sparkle = document.createElementNS(ns, 'path');
  sparkle.setAttribute('d', 'M20 2l.8 2.5L23.3 5.3l-2.5.8L20 8.6l-.8-2.5L16.7 5.3l2.5-.8L20 2z');
  sparkle.setAttribute('fill', 'currentColor');
  svg.appendChild(sparkle);

  // Small sparkle
  const sparkle2 = document.createElementNS(ns, 'path');
  sparkle2.setAttribute('d', 'M18.5 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z');
  sparkle2.setAttribute('fill', 'currentColor');
  sparkle2.setAttribute('opacity', '0.6');
  svg.appendChild(sparkle2);

  return svg;
}

/**
 * Create the skim button element styled like a native YouTube player button.
 */
export function createButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'ytp-button';
  btn.title = 'YoutubeGlance';
  btn.setAttribute('aria-label', 'YoutubeGlance - Summarize with AI');
  btn.setAttribute('data-tooltip-text', 'YoutubeGlance');

  // Match YouTube's native ytp-button: 48x40, padding 0, SVG ~24-26px
  Object.assign(btn.style, {
    width: '48px',
    height: '40px',
    padding: '0',
    margin: '0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    opacity: '0.9',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    color: '#fff',
    flexShrink: '0',
  } as Record<string, string>);

  btn.appendChild(createIconSvg());

  // Custom tooltip (YouTube's native tooltip doesn't work for injected buttons)
  const tooltip = document.createElement('div');
  Object.assign(tooltip.style, {
    position: 'absolute',
    bottom: '46px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(28, 28, 28, 0.9)',
    color: '#fff',
    padding: '5px 9px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    zIndex: '9999',
    fontFamily: 'Roboto, Arial, sans-serif',
    letterSpacing: '0.2px',
  } as Record<string, string>);
  tooltip.textContent = 'YoutubeGlance';
  btn.appendChild(tooltip);

  btn.addEventListener('mouseenter', () => {
    btn.style.opacity = '1';
    tooltip.style.opacity = '1';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.opacity = '0.9';
    tooltip.style.opacity = '0';
  });

  return btn;
}

export function buttonExists(): boolean {
  return document.getElementById(BUTTON_ID) !== null;
}

export function removeButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}

export { BUTTON_ID };
