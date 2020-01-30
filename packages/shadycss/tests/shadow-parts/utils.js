
window.black = 'rgb(0, 0, 0)';
window.red = 'rgb(255, 0, 0)';
window.green = 'rgb(0, 128, 0)';
window.blue = 'rgb(0, 0, 255)';
window.orange = 'rgb(255, 165, 0)';

window.pierce = (...selectors) => {
  let node = document.body;
  if (selectors[0] instanceof Node) {
    node = selectors.shift();
  }
  while (selectors.length > 0) {
    const selector = selectors.shift();
    node = (node.shadowRoot || node).querySelector(selector);
    if (node === null) {
      return null;
    }
  }
  return node;
};

window.color = (...selectors) => {
  const node = window.pierce(...selectors);
  if (node === null) {
    return null;
  }
  const style = getComputedStyle(node);
  return style.color;
};
