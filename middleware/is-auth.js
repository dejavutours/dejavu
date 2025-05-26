module.exports = (req, res, next) => {
    if (res.locals.profile.email !== (process.env.GMAIL_ADMIN || process.env.GMAIL_ADMIN1 )) {
        return res.redirect('/');
    }
    next();
}