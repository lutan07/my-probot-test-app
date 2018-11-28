const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
})

async function handlePullRequestClosedChange(context) {

    const { sender, repository, number, pull_request } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})

    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // creates PR if regression fix has been merged to release branch
    if (pull_request.merged) {
        if (branchTicketNumber.length > 1) {
            let isReleaseBranchMerged = false
            for (let number of branchTicketNumber) {
                // api call to associated ticket
                const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })
                // checks labels of associated ticket to PR
                for (let label of ticketAssociatedWithPullRequest.data.labels) {
                    if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
                        // remove Release Branch label
                        const removeLabelResult = await octokit.issues.removeLabel({owner: 'lutan07' , repo: repository.name, number: number, name: ['Release Branch']})
                        isReleaseBranchMerged = true
                        break;
                    }
                }
            }
            // create PR
            if (isReleaseBranchMerged) {
                const createPR = await octokit.pullRequests.create({ owner: 'lutan07', repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: 'Branch has been merged into Release' })                       
            }
        } else {
            const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })
  
            for (let label of ticketAssociatedWithPullRequest.data.labels) {
                if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
                    // remove Release Branch label
                    const removeLabelResult = await octokit.issues.removeLabel({owner: 'lutan07' , repo: repository.name, number: branchTicketNumber , name: ['Release Branch']})
                    // create PR
                    const createPR = await octokit.pullRequests.create({ owner: 'lutan07', repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: 'Branch has been merged into Release' })
                }
            }
        }
    }
}

module.exports = handlePullRequestClosedChange