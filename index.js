const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN
})

module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  // grabbing all events with labels being removed
  app.on('issues.unlabeled', async context => {

    const { repository, issue } = context.payload;

    const result = await octokit.issues.listEventsForRepo({ owner: issue.user.login, repo: repository.name })

    // get all latest events with the same timestamp
    const latestEvent = result.data[0];
    const sameTimestampEvents = result.data.reduce((acc, curr) => {
      if (curr.created_at === latestEvent.created_at && curr.event === 'unlabeled')
        acc.push(curr)

      return acc
    }, [])

    for (const event of sameTimestampEvents) {
      if (event.label.name === 'Release QA' && event.issue.labels.find(label => label.name === 'Failed Release QA')) {
        // Replace Priority Label
        const replacements = event.issue.labels.map(label => {
          if (label.name.startsWith('Priority')) {
            return 'Priority: 1-Critical'
           } else {
            return label.name
          }
        })

        const replaceLabelResult = await octokit.issues.replaceLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: replacements })

        // Add Remediation Label 
        const addLabelResult = await octokit.issues.addLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: ['Remediation', 'Release Branch'] })

        // Remove Failed Release QA Label
        const removeLabelResult = await octokit.issues.removeLabel({owner: issue.user.login , repo: repository.name, number: issue.number , name: ['Failed Release QA']})

        // Open ticket if closed
        if (event.issue.state === "closed") {
          const changeIssueState = await octokit.issues.update({ owner: issue.user.login, repo: repository.name, number: issue.number, state: 'open'})
        }
      }
    }
  })

  // grabbing events where pull request has been opened
  app.on(['pull_request.opened', 'pull_request.closed'], async context => {

    const { sender, repository, number } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})

    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // checks if PR is on the correct branch, returns a comment if not
    if (branchTicketNumber.length > 1) {
      for (let number of branchTicketNumber) {
        // api call to associated ticket
        const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })

        // checks labels of associated ticket to PR
        for (let label of pullRequestAssociatedTicket.data.labels) {
          if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
            const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
            return context.github.issues.createComment(pullRequestComment)
          } else {
            global.globalTicketNumberArray.push(branchTicketNumber)
            console.log(globalTicketNumberArray)
          }
        }
      }
    } else {

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
              const createPR = await octokit.pullRequests.create({owner: 'lutan07', repo: repository.name, title: result.data.title, head: result.data.head.ref, base: result.data.base.ref, body: 'Branch has been merged into Release', maintainer_can_modify})
            }
          }
        }
      } else {
        const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })
  
        for (let label of pullRequestAssociatedTicket.data.labels) {
          if (label.name === 'Release Branch' && !result.data.base.label.includes('master')) {
            // create PR
            console.log('creating PR - 1')
            const createPR = await octokit.pullRequests.create({owner: 'lutan07', repo: repository.name, title: result.data.title, head: result.data.head.ref, base: result.data.base.ref, body: 'Branch has been merged into Release', maintainer_can_modify})
          }
        }
      }
    }
  })

  // // check for closed/merged tickets to create a PR against master branch
  // app.on('pull_request.closed', async context => {
  //   console.log(context)

  //   if (context.payload.pull_request.merged) {
  //     const pullRequestAssociatedTicket = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })
  //   }
  // })


  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
