// This needs to run first so that it can catch reported errors before Mocha's
// global error handler does.
window.catchReportedErrors = (() => {
  let currentHandler = undefined;

  window.addEventListener('error', e => {
    if (currentHandler) currentHandler(e);
  }, true);

  return (fn, handler) => {
    currentHandler = handler;
    fn();
    currentHandler = undefined;
  };
})();
