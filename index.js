const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN
})

module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  global.pullRequestHeadTicketNumber;
  
  // app.on('*', async context => {
  //   app.log('all data', context)
  // })

  // app.on('issues.opened', async context => {
  //   const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
  //   // return context.github.issues.createComment(issueComment)
  // })

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
  app.on('pull_request.opened', async context => {

    const { sender, repository, number } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: number})

    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)

    // checks if PR is on the correct branch, returns a comment if not
    if (branchTicketNumber > 1) {
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
    }
  })

  app.on('pull_request', async context => {
    console.log(context)
  })


  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
