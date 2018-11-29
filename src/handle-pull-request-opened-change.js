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

    // checks if PR is on the correct branch, returns a comment if not
    if (branchTicketNumber.length > 1) {
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
            console.log('ticket assoc', ticketAssociatedWithPullRequest)
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
}

module.exports = handlePullRequestOpenedChange