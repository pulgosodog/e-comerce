document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('use-location');
  const status = document.getElementById('loc-status');
  const latIn = document.getElementById('lat');
  const lngIn = document.getElementById('lng');
  const cancelBtn = document.getElementById('cancel-location');
  const preview = document.getElementById('map-preview');

  if (!btn) return;

  function clearLocation() {
    if (latIn) latIn.value = '';
    if (lngIn) lngIn.value = '';
    if (preview) {
      preview.innerHTML = '';
      preview.style.display = 'none';
    }
    if (status) status.textContent = '';
    btn.textContent = 'Usar mi ubicación';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  function handleSuccess(pos) {
    const lat = pos.coords.latitude.toFixed(8);
    const lng = pos.coords.longitude.toFixed(8);
    if (latIn) latIn.value = lat;
    if (lngIn) lngIn.value = lng;
    // do not show raw coordinates to the user; only show preview
    if (preview) {
      preview.innerHTML = getGoogleMapsEmbed(lat, lng, 16);
      preview.style.display = 'block';
    }
    // Indicate ready state to user
    if (status) status.textContent = 'Ubicación lista';
    btn.textContent = 'Intentar de nuevo';
    if (cancelBtn) {
      // show the centered cancel button wrapper
      const wrap = document.getElementById('cancel-wrap');
      if (wrap) wrap.style.display = 'block';
    }
  }

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Geolocalización no soportada por el navegador';
      return;
    }
    status.textContent = 'Obteniendo ubicación...';
    navigator.geolocation.getCurrentPosition(function (pos) {
      handleSuccess(pos);
    }, function (err) {
      status.textContent = 'Error al obtener ubicación: ' + (err && err.message ? err.message : err.code);
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      clearLocation();
      const wrap = document.getElementById('cancel-wrap');
      if (wrap) wrap.style.display = 'none';
    });
  }
});

function getGoogleMapsEmbed(lat, lng, zoom = 17) {
  const latSafe = encodeURIComponent(lat);
  const lngSafe = encodeURIComponent(lng);
  const z = Number(zoom) || 17;
  return `\n    <iframe width="100%" height="300" style="border:0" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=${latSafe},${lngSafe}&z=${z}&output=embed"></iframe>\n  `;
}
