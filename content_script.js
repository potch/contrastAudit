function contrastAudit() {
  const colortypes = {
    RGB: /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
    RGBA: /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)$/
  }
  const int = s => parseInt(s, 10) || 0;
  const float = s => parseFloat(s) || 0;
  const lum = ({r, g, b}) => .2126 * r + .7152 * g + .0722 * b; // assumes sRGB
  const gam = n => Math.pow(n, 2.2); // the sRGB gamma correction
  const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

  function color(s) {
    if (colortypes.RGB.test(s)) {
      let m = s.match(colortypes.RGB);
      return {
        r: gam(int(m[1]) / 255),
        g: gam(int(m[2]) / 255),
        b: gam(int(m[3]) / 255),
        a: 1
      };
    } else if (colortypes.RGBA.test(s)) {
      let m = s.match(colortypes.RGBA);
      return {
        r: gam(int(m[1]) / 255),
        g: gam(int(m[2]) / 255),
        b: gam(int(m[3]) / 255),
        a: gam(float(m[4]))
      };
    }
  }

  function checkLuminosity(el) {
    let style = getComputedStyle(el);
    let textColor = style.getPropertyValue('color')
    let textColorRGB = color(textColor);
    let bgEl = el;
    let bgColor = style.getPropertyValue('background-color');
    let bgColorRGB = color(bgColor);
    while (bgColorRGB.a === 0 && bgEl.parentElement) {
      bgEl = bgEl.parentElement;
      bgColor = getComputedStyle(bgEl).getPropertyValue('background-color');
      bgColorRGB = color(bgColor);
    }
    luminosities.push({
      el: el,
      ratio: ratio(lum(textColorRGB), lum(bgColorRGB)),
      text: textColor,
      background: bgColor
    });
  }

  let luminosities = [];

  function walk(node) {
    if (node.innerText && node.innerText.trim()) {
      checkLuminosity(node);
    }
    if (node.children.length) {
      for (let child of node.children) {
        walk(child);
      }
    }
  }

  walk(document.body);

  let warnings = luminosities.filter(l => l.ratio < 4.5);
  let seenColors = {};
  warnings = warnings.reduce((list, w) => {
    let key = w.text + ':' + w.background;
    if (seenColors[key]) {
      seenColors[key].others++;
    } else {
      w.others = 0;
      list.push(w);
      seenColors[key] = w;
    }
    return list;
  }, []);
  console.groupCollapsed(`Audit found ${warnings.length} contrast warnings (click to see all)`);
  warnings.forEach(w => {
    let otherText = '';
    if (w.others === 1) {
      otherText = '(and 1 other) ';
    } else if (w.others > 1) {
      otherText = `(and ${w.others} others) `;
    }
    console.log(w.el, `${otherText}has ratio of ${w.ratio}`);
    console.log('%c sample text ', `color: ${w.text}; background: ${w.background}; font-size:14px; padding: 8px;`);
  });
  console.groupEnd();
};

exportFunction(contrastAudit, window, {defineAs: 'contrastAudit'});
