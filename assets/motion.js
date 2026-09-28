/* Padel Académie · animations partagées (index + merci) : apparitions au scroll, compteurs, en-tête, halo pointeur */
(function(){
  var d=document,calme=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cibles=d.querySelectorAll('[data-r]');
  if('IntersectionObserver' in window&&!calme){
    var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.12});
    cibles.forEach(function(el){io.observe(el);});
  }else cibles.forEach(function(el){el.classList.add('in');});

  /* Le texte final est déjà dans le HTML (sans JS, rien ne manque) : on ne le rejoue que s'il entre à l'écran */
  var compteurs=d.querySelectorAll('[data-count]');
  function formate(v,dec){return v.toLocaleString('fr-FR',{minimumFractionDigits:dec,maximumFractionDigits:dec});}
  if('IntersectionObserver' in window&&!calme){
    var ioc=new IntersectionObserver(function(en){en.forEach(function(e){
      if(!e.isIntersecting)return;ioc.unobserve(e.target);
      var el=e.target,fin=parseFloat(el.dataset.count),dec=parseInt(el.dataset.dec||'0',10),suf=el.dataset.suf||'',t0=null,dur=1600;
      function pas(t){if(!t0)t0=t;var p=Math.min((t-t0)/dur,1),e2=1-Math.pow(1-p,4);el.textContent=formate(fin*e2,dec)+suf;if(p<1)requestAnimationFrame(pas);}
      el.textContent=formate(0,dec)+suf;requestAnimationFrame(pas);
    });},{threshold:.4});
    compteurs.forEach(function(el){ioc.observe(el);});
  }

  var h=d.getElementById('hdr');
  if(h){var maj=function(){h.classList.toggle('scrolled',window.scrollY>24);};addEventListener('scroll',maj,{passive:true});maj();}

  d.addEventListener('pointermove',function(e){
    var c=e.target.closest&&e.target.closest('.spot');if(!c)return;
    var r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
})();

/* Bandeau des noms : la piste est doublée pour boucler sans couture (translateX -50 %) */
(function(){var n=document.getElementById('names');if(n)n.innerHTML+=n.innerHTML;})();
