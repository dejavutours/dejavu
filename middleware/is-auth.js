module.exports = (req, res, next) => {
    if (res.locals.profile.email !== process.env.GMAIL_ADMIN ) {
        return res.redirect('/');
    }
    next();
}