const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN
})

module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  // app.on('issues.opened', async context => {
  //   const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
  //   // return context.github.issues.createComment(issueComment)
  // })

  app.on('pull_request.open', async context => {
    app.log('pull request', context)
  })

  // app.on('*', async context => {
  //   app.log('context', context)
  //   // const result = await octokit.pulls.get({ owner: context.payload.issue.user.login, repo: context.payload.repository.name, number: context.payload.issue.number })
  //   // app.log('merged', result)
  // })

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
        const addLabelResult = await octokit.issues.addLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: ['Remediation'] })

        // Open ticket if closed
        if (event.issue.state === "closed") {
          const changeIssueState = await octokit.issues.update({ owner: issue.user.login, repo: repository.name, number: issue.number, state: 'open'})
        }
      }
    }
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
