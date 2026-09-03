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
  function initPerformanceViews(){
    var modules=document.querySelectorAll('[data-investments-block="performance"]');
    modules.forEach(function(module){
      var control=module.querySelector('[data-performance-view-control]');
      var buttons=Array.prototype.slice.call(module.querySelectorAll('[data-performance-view-target]'));
      var panels=Array.prototype.slice.call(module.querySelectorAll('[data-performance-view]'));
      if(!control||buttons.length!==2||panels.length!==2){return;}
      var selected='cumulative';
      var wide=window.matchMedia('(min-width: 641px)');
      function sync(){
        control.hidden=!wide.matches;
        buttons.forEach(function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-performance-view-target')===selected));});
        panels.forEach(function(panel){panel.hidden=wide.matches&&panel.getAttribute('data-performance-view')!==selected;});
      }
      buttons.forEach(function(button,index){
        button.addEventListener('click',function(){selected=button.getAttribute('data-performance-view-target');sync();});
        button.addEventListener('keydown',function(event){
          var next=index;
          if(event.key==='ArrowLeft'||event.key==='ArrowUp'){next=(index+buttons.length-1)%buttons.length;}
          else if(event.key==='ArrowRight'||event.key==='ArrowDown'){next=(index+1)%buttons.length;}
          else if(event.key==='Home'){next=0;}
          else if(event.key==='End'){next=buttons.length-1;}
          else{return;}
          event.preventDefault();
          selected=buttons[next].getAttribute('data-performance-view-target');
          sync();
          buttons[next].focus();
        });
      });
      if(wide.addEventListener){wide.addEventListener('change',sync);}else{wide.addListener(sync);}
      sync();
    });
  }
  initPerformanceViews();
  document.documentElement.classList.add('js-ready');
})();
