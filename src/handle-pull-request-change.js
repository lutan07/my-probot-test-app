const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
})

async function handlePullRequestChange(context) {
    
    const { sender, repository, number, action, pull_request } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})

    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // checks if PR is on the correct branch, returns a comment if not
    if (branchTicketNumber.length > 1 && action === 'opened') {
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
    } else if (branchTicketNumber.length == 1 && action === 'opened') {
      const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })

      for (let label of ticketAssociatedWithPullRequest.data.labels) {
        if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
          const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
          return context.github.issues.createComment(pullRequestComment)
        }
      }
    }

    // creates PR if regression fix has been merged to release branch
    if (pull_request.merged) {
      if (branchTicketNumber.length > 1) {
        let isReleaseBranchMerged = false
        for (let number of branchTicketNumber) {
            // api call to associated ticket
            const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })
            console.log('ticket number', number)
            // checks labels of associated ticket to PR
            for (let label of ticketAssociatedWithPullRequest.data.labels) {
                if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
                    // remove Release Branch label
                    console.log('removing label')
                    const removeLabelResult = await octokit.issues.removeLabel({owner: 'lutan07' , repo: repository.name, number: number, name: ['Release Branch']})
                    isReleaseBranchMerged = true
                    // // create PR
                    // if (!isPRCreated) {
                    //     console.log('creating a PR')
                    //     const createPR = await octokit.pullRequests.create({ owner: 'lutan07', repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: 'Branch has been merged into Release' })                       
                    //     isPRCreated = true
                    // }
                    break;
                }
            }
        }
        console.log('is release branch merged', isReleaseBranchMerged)
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

module.exports = handlePullRequestChange