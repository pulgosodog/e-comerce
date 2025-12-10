document.addEventListener('DOMContentLoaded', () => {
  let idx = 0;
  const carousel = document.querySelector('.carousel');
  const slides = document.querySelectorAll('.carousel-slide');
  if (!carousel || slides.length === 0) return;
  const prev = document.querySelector('.carousel-prev');
  const next = document.querySelector('.carousel-next');
  function show(i){
    idx = (i + slides.length) % slides.length;
    carousel.style.transform = `translateX(-${idx*100}%)`;
  }
  prev && prev.addEventListener('click', ()=> show(idx-1));
  next && next.addEventListener('click', ()=> show(idx+1));
  // auto rotate
  let auto = setInterval(()=> show(idx+1), 6000);
  // pause on hover
  carousel.addEventListener('mouseenter', ()=> { clearInterval(auto); });
  carousel.addEventListener('mouseleave', ()=> { auto = setInterval(()=> show(idx+1), 6000); });
});
