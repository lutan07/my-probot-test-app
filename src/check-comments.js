async function checkComments(issues, pull) {
    const comments = await issues.listComments(pull)
    return (comment = comments.data.find(c => { return c.user.login.includes('[bot]') }))
}

module.exports = checkComments