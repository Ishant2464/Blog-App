function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.redirect("/user/signin");
  }

  return next();
}

module.exports = {
  ensureAuthenticated,
};