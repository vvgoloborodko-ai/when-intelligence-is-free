(function () {
  var menu = document.querySelector('.menu-toggle');
  var navigation = document.querySelector('.nav-links');
  if (menu && navigation) {
    menu.hidden = false;
    document.documentElement.classList.add('js-ready');
    menu.addEventListener('click', function () {
      var expanded = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(expanded));
      navigation.classList.toggle('is-open', expanded);
    });
    navigation.addEventListener('click', function () {
      menu.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        menu.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
        menu.focus();
      }
    });
  }
  // Keep pre-route inbound hashes. Section and subscription links remain native.
  var routes = {home:'/',research:'/research/',investments:'/investments/',advisory:'/advisory/',about:'/about/'};
  function legacyRoute() {
    var key = location.hash.slice(1);
    if (routes[key] && !document.getElementById(key)) location.replace(routes[key]);
  }
  legacyRoute();
  window.addEventListener('hashchange', legacyRoute);
  document.querySelectorAll('[data-investments-block="performance"]').forEach(function (module) {
    var control = module.querySelector('[data-performance-view-control]');
    var buttons = Array.from(module.querySelectorAll('[data-performance-view-target]'));
    var panels = Array.from(module.querySelectorAll('[data-performance-view]'));
    if (!control || buttons.length !== 2 || panels.length !== 2) return;
    var selected = 'cumulative';
    function sync() {
      control.hidden = false;
      buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.performanceViewTarget === selected)); });
      panels.forEach(function (panel) { panel.hidden = panel.dataset.performanceView !== selected; });
    }
    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () { selected = button.dataset.performanceViewTarget; sync(); });
      button.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + 1) % 2;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % 2;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = 1;
        else return;
        event.preventDefault();
        selected = buttons[next].dataset.performanceViewTarget;
        sync();
        buttons[next].focus();
      });
    });
    sync();
  });
})();
