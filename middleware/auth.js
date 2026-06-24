const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  // if request expects HTML, redirect; if AJAX/JSON, return 403
  if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) return res.status(403).json({ success: false, message: 'Forbidden' });
  return res.redirect('/');
};

module.exports = { isAdmin };
