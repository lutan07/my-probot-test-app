const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN
})
const handleLabelsRequestChange = require('./src/handle-labels-request-change')
const handlePullRequestOpenedChange = require('./src/handle-pull-request-opened-change')
const handlePullRequestClosedChange = require('./src/handle-pull-request-closed-change')

function probotGithubApp (app) {
  app.on('issues.unlabeled', handleLabelsRequestChange)
  app.on('pull_request.opened', handlePullRequestOpenedChange)
  app.on('pull_request.closed', handlePullRequestClosedChange)
}

module.exports = probotGithubApp
