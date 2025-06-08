module.exports = (req, res, next) => {
    const email = res.locals.profile?.email;
    if (email !== process.env.GMAIL_ADMIN && email !== process.env.GMAIL_ADMIN_TWO) {
        return res.redirect('/');
    }
    next();
}
