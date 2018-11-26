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

  // app.on(`*`, async context => {
  //   app.log(context)
  //   context.log({ event: context.event, action: context.payload.action, label: context.payload.label })
  // })

  app.on('issues.unlabeled', async context => {
    // const labels = await context.github.issues.getLabels({ name })
    // const action = await context.payload.action
    // const labelTag = await context.payload.label.name
    // let isFailedReleaseQA = false
    // console.log(JSON.stringify(context.payload, null, 2))

    const { repository, issue } = context.payload;

    // const result = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: issue.number })
    const result = await octokit.issues.listEventsForRepo({ owner: issue.user.login, repo: repository.name })
    // app.log('data', result.data)

    // get all latest events with the same timestamp
    const latestEvent = result.data[0];
    const sameTimestampEvents = result.data.reduce((acc, curr) => {
      if (curr.created_at === latestEvent.created_at && curr.event === 'unlabeled')
        acc.push(curr)

      return acc
    }, [])

    // app.log('sameTimestampEvents', JSON.stringify(sameTimestampEvents, null, 2))

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
        // app.log('replacements', replacements)
        const replaceLabelResult = await octokit.issues.replaceLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: replacements })
        // app.log('replaceLabelResult', replaceLabelResult)

        // Add Remediation Label 
        const addLabelResult = await octokit.issues.addLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: ['Remediation'] })
        // app.log('addLabelResult', addLabelResult)

        // Open ticket if closed
        if (event.issue.state === "closed") {
          const changeIssueState = await octokit.issues.update({ owner: issue.user.login, repo: repository.name, number: issue.number, state: 'open'})
        }
        app.log('event logged', event)
      }
    }
    
    // app.log("unlabeled issue: ", { action: context.payload.action, label: context.payload.label.name })
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
