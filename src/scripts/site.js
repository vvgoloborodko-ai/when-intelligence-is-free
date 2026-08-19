(function(){
  var views={home:document.getElementById('home'),research:document.getElementById('research'),investments:document.getElementById('investments'),advisory:document.getElementById('advisory')};
  var routes={home:'/',research:'/research/',investments:'/investments/',advisory:'/advisory/'};
  Object.keys(views).forEach(function(k){if(!views[k]){delete views[k];}});
  var navLinks=document.querySelectorAll('.nav-links a[data-nav]');
  function show(key){
    if(!views[key]){key=document.documentElement.getAttribute('data-initial-view')||Object.keys(views)[0];}if(!views[key]){key=Object.keys(views)[0];}
    Object.keys(views).forEach(function(k){views[k].classList.toggle('active',k===key);});
    navLinks.forEach(function(a){var current=a.getAttribute('data-nav')===key;a.classList.toggle('active',current);if(current){a.setAttribute('aria-current','page');}else{a.removeAttribute('aria-current');}});
  }
  function activeKey(){
    var k=Object.keys(views)[0]||'home';
    Object.keys(views).forEach(function(n){if(views[n].classList.contains('active')){k=n;}});
    return k;
  }
  function viewKeyOf(el){
    var m=el.closest?el.closest('[data-view]'):null;
    return m?(m.getAttribute('data-view')||m.id):'home';
  }
  function render(){
    var raw=(location.hash||('#'+(document.documentElement.getAttribute('data-initial-view')||'home'))).slice(1);
    if(views[raw]){show(raw);window.scrollTo(0,0);return;}if(routes[raw]){location.replace(routes[raw]);return;}
    var target=document.getElementById(raw);
    if(target){show(viewKeyOf(target));target.scrollIntoView({behavior:'smooth',block:'start'});return;}
    show('home');window.scrollTo(0,0);
  }
  /* Subscribe resolves to the block on the page you are already on. */
  document.addEventListener('click',function(e){
    var a=e.target.closest?e.target.closest('a[data-nav="subscribe"]'):null;
    if(!a){return;}
    var local=document.getElementById('subscribe-'+activeKey());
    if(!local){return;}
    e.preventDefault();
    if(location.hash==='#'+local.id){local.scrollIntoView({behavior:'smooth',block:'start'});}
    else{location.hash=local.id;}
  });
  window.addEventListener('hashchange',render);
  render();
  document.documentElement.classList.add('js-ready');
})();
