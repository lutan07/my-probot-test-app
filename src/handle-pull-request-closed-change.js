async function handlePullRequestClosedChange(context) {
    
    const { sender, repository, number, pull_request } = context.payload
    const { issues, pullRequests } = context.github
    
    // api call to get data from the pull request being created
    const result = await pullRequests.get({owner: sender.login, repo: repository.name, number: number})
    const owner = result.data.head.repo.full_name.split('/', 1).toString()

    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // creates PR if regression fix has been merged to release branch
    if (pull_request.merged) {
        if (branchTicketNumber.length > 1) {
            let isReleaseBranchMerged = false
            for (let number of branchTicketNumber) {
                // api call to associated ticket
                const ticketAssociatedWithPullRequest = await issues.get({ owner: owner, repo: repository.name, number: number })
                // checks labels of associated ticket to PR
                for (let label of ticketAssociatedWithPullRequest.data.labels) {
                    if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
                        // remove Release Branch label
                        const removeLabelResult = await issues.removeLabel({owner: owner , repo: repository.name, number: number, name: ['Release Branch']})
                        isReleaseBranchMerged = true
                        break;
                    }
                }
            }
            // create PR
            if (isReleaseBranchMerged) {
                const createPR = await pullRequests.create({ owner: owner, repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: result.data.body })                       
            }
        } else {
            const ticketAssociatedWithPullRequest = await issues.get({ owner: owner, repo: repository.name, number: branchTicketNumber })
  
            for (let label of ticketAssociatedWithPullRequest.data.labels) {
                if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
                    // remove Release Branch label
                    const removeLabelResult = await issues.removeLabel({owner: owner , repo: repository.name, number: branchTicketNumber , name: ['Release Branch']})
                    // create PR
                    const createPR = await pullRequests.create({ owner: owner, repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: result.data.body })
                }
            }
        }
    }
}

module.exports = handlePullRequestClosedChange