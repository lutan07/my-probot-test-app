const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN
})
const handleLabelsRequestChange = require('./src/handle-labels-request-change')
const handlePullRequestChange = require('./src/handle-pull-request-change')



function probotGithubApp (app) {
  app.on('issues.unlabeled', handleLabelsRequestChange)
  app.on(['pull_request.opened', 'pull_request.closed'], handlePullRequestChange)
}

module.exports = probotGithubApp
