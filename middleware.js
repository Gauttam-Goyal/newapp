module.exports.isLoggedIn = (req, res, next) => {
    console.log("hello user ", req.user);
    if (!req.isAuthenticated()) {
        // req.session.returnTo = req.originalUrl
        // req.flash('error', 'You must be signed in first!');
        console.log("you must be logged in")
        return res.redirect('/login');
    }
    next();
}
// =isLoggedIn;