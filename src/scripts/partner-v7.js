(function () {
  var oldAboutSections = { 'track-record':'.v10-experience', 'how-i-work':'.v10-about-hero', 'career':'.v10-seats', 'engagement':'.advisory-close', 'context':'.v10-about-hero', 'research-investing':'.v10-about-hero' };
  if (document.getElementById('about')) {
    Object.keys(oldAboutSections).forEach(function (id) {
      var target = document.querySelector(oldAboutSections[id]);
      if (target) { var anchor=document.createElement('span'); anchor.id=id; anchor.className='v7-legacy-anchor'; target.prepend(anchor); }
    });
    var anchor=document.getElementById(location.hash.slice(1));
    if (anchor) anchor.scrollIntoView();
  }

})();
