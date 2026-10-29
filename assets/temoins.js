/* Padel Académie · témoignages vidéo (index + merci) : les vidéos du mur Senja, servies par Mux, lues sur place au clic.
   Le mur Senja en iframe faisait 18 000 px de haut : dans un cadre on n'en voyait que des morceaux. */
(function(){
  var d=document,racines=d.querySelectorAll('[data-temoins]');
  if(!racines.length)return;
  // [playback Mux, nom affiché, 5 étoiles sur Senja]. Antoine Blanco écarté : sa vidéo est en paysage.
  var V=[
    ['77DO01snJtRP7VtQshOjNj01WDU02MpXxdvxjlf01QQHEVw','Thibaut Pitolin',1],
    ['QDT00SspQC6RCiJbMH3g0272nE9fRE00tWx01gcy16HNMhE','Willy Fayard',1],
    ['Ec9l3Ccbmdu0102E3zU4014c02rEMtAZS8LjQb00DtkXqJ3U','Hugo Legname',1],
    ['Pskagae6fGcJcLnLLp02I2SqiPSD56PJ00mlI2I4WCHyI','Axel Duriez',1],
    ['YASmWBU73qFJX7LdJOSEuYS4Kmpv5PJybyobuYahSc8','Schub Sol',1],
    ['5mRdRaUU94eybZkf7WPTtcwEiCUxZdLNfUgCM01Awvpw','Lucas Delbergue',0],
    ['s48p00VxTDOuyT1Zz367e7UB8BC9wMltxnRTFDjAwYgM','Nathanael JNP',1],
    ['qpHQwZhoS8Mu3DYQUJrGf1bkj8L800da3p1LL2NPM5YI','Lucas Danguy',1],
    ['1hJXT8paeCn013ulCQUi4ssSwPizlMaCYbwQ6YRdCMQc','Abdel',1],
    ['DwsQfPwZ2GoUVxvTdrS2zMN01oaf00zc02ok0202rLNRZmF4','Amine Boubeker',0],
    ['pQJNabwfMFjgF800M02LQHiAAQHHppIK700oqGBt7DuiUM','Gaetan Quets',1],
    ['24tMqeKybTpsr01Eg02PnThrVy9x02rFZPHXytVkSWn85A','Amar Als',1]
  ];
  var cartes=V.map(function(v){
    return '<div class="tv"><button type="button" data-id="'+v[0]+'" aria-label="Lire la vidéo : '+v[1]+'">'+
      '<img src="https://image.mux.com/'+v[0]+'/thumbnail.webp?width=680" loading="lazy" alt="">'+
      '<span class="tv-play" aria-hidden="true"><svg viewBox="0 0 22 26"><use href="#play"/></svg></span>'+
      '<span class="tv-nom">'+(v[2]?'<span class="stars" aria-hidden="true">★★★★★</span>':'')+v[1]+'</span></button></div>';
  }).join('');

  racines.forEach(function(r){
    r.innerHTML='<div class="tv-rail">'+cartes+'</div>'+
      '<button class="tv-fl prec" type="button" aria-label="Vidéos précédentes">←</button>'+
      '<button class="tv-fl suiv" type="button" aria-label="Vidéos suivantes">→</button>';
    var rail=r.firstChild;
    r.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;
      if(b.classList.contains('tv-fl')){rail.scrollBy({left:(b.classList.contains('prec')?-1:1)*rail.clientWidth*.8,behavior:'smooth'});return;}
      var vid=d.createElement('video');
      vid.src='https://stream.mux.com/'+b.dataset.id+'/medium.mp4';
      vid.poster=b.querySelector('img').src;vid.controls=true;vid.playsInline=true;
      b.replaceWith(vid);vid.play().catch(function(){});
    });
    // une seule vidéo à la fois sur la page ('play' ne remonte pas : écoute en capture)
    r.addEventListener('play',function(e){d.querySelectorAll('[data-temoins] video').forEach(function(v){if(v!==e.target)v.pause();});},true);
    function bords(){r.classList.toggle('debut',rail.scrollLeft<8);r.classList.toggle('fin',rail.scrollLeft+rail.clientWidth>rail.scrollWidth-8);}
    rail.addEventListener('scroll',bords,{passive:true});bords();
  });
})();
