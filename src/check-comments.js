async function checkComments(issues, pull) {
    const comments = await issues.listComments(pull)
    return (comment = comments.data.find(comment => comment.user.login === 'Probot'))
}

module.exports = checkComments