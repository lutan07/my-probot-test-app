const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
})

async function handlePullRequestChange(context) {
    console.log(context)
    
    const { sender, repository, number, action } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})
    // console.log('result', result)

    // const createPR = await octokit.pullRequests.create({owner: 'lutan07', repo: 'my-probot-test-app', title: 'test title', head: 'lutan07:lt-#109', base: 'master', body: 'Branch has been merged into Release'})


    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // checks if PR is on the correct branch, returns a comment if not
    if (branchTicketNumber.length > 1 && action === 'opened') {
      for (let number of branchTicketNumber) {
        // api call to associated ticket
        const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })

        // checks labels of associated ticket to PR
        for (let label of pullRequestAssociatedTicket.data.labels) {
          if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
            const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
            return context.github.issues.createComment(pullRequestComment)
          }
        }
      }
    } else if (branchTicketNumber.length == 1 && action === 'opened') {
      const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })

      for (let label of pullRequestAssociatedTicket.data.labels) {
        if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
          const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
          return context.github.issues.createComment(pullRequestComment)
        }
      }
    }

    // creates PR if regression fix has been merged to release branch
    if (context.payload.pull_request.merged) {
      console.log('result of merged branch', result)

      if (branchTicketNumber.length > 1) {
        for (let number of branchTicketNumber) {
          // api call to associated ticket
          const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })
  
          // checks labels of associated ticket to PR
          for (let label of pullRequestAssociatedTicket.data.labels) {
            if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
              // create PR
              console.log('creating PR - multiple')
              const createPR = await octokit.pullRequests.create({ owner: 'lutan07', repo: repository.name, title: result.data.title, head: `${result.data.user.login}:${result.data.head.ref}`, base: 'master', body: 'Branch has been merged into Release' })
              return
            }
          }
        }
      } else {
        const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })
  
        for (let label of pullRequestAssociatedTicket.data.labels) {
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