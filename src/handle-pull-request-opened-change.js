const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
})

async function handlePullRequestOpenedChange(context) {
    
    const { sender, repository, number } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})
    
    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    if (!branchTicketNumber) {
        const comment = context.issue({ body: 'Branch needs to be named properly' })
        return context.github.issues.createComment(comment)
    } else if (branchTicketNumber.length > 1) {
        // checks if PR is on the correct branch, returns a comment if not
        for (let number of branchTicketNumber) {
            // api call to associated ticket
            const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })

            // checks labels of associated ticket to PR
            for (let label of ticketAssociatedWithPullRequest.data.labels) {
                if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
                    const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
                    return context.github.issues.createComment(pullRequestComment)
                }
            }
        }
    } else if (branchTicketNumber.length == 1) {
        const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })

        for (let label of ticketAssociatedWithPullRequest.data.labels) {
            if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
            const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
            return context.github.issues.createComment(pullRequestComment)
            }
        }
    }

    // check if there is a description in the PR
    if (!result.data.body.includes('fixes #') || !result.data.body.includes('test plan')) {
        const descComment = context.issue({ body: 'Description incomplete, expects "fixes #<ticket number>" and "test plan".' })
        return context.github.issues.createComment(descComment)
    }
}

module.exports = handlePullRequestOpenedChange