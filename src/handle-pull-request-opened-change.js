const octokit = require('@octokit/rest')()
const client = octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
})
const checkComments = require('./check-comments')
const formatMessages = require('./format-messages')

async function handlePullRequestOpenedChange(context) {
    // 1. Extract necessary info
    const pull = context.issue()
    const { sha } = context.payload.pull_request.head
    const repo = context.repo()

    // GH API
    const { paginate, issues, repos, pullRequests } = context.github

    // Hold this PR info
    const statusInfo = { ...repo, sha, context: "Probot" }

    // Pending
    await repos.createStatus({
        ...statusInfo,
        state: "pending",
        description: "Waiting for the status to be reported"
    })

    const { sender, repository } = context.payload
    
    // api call to get data from the pull request being created
    const result = await octokit.pullRequests.get({owner: sender.login, repo: repository.name, number: pull.number})
    
    let pullRequestRegex = /(?<=#)\d+/g
    let branchTicketNumber = result.data.head.label.match(pullRequestRegex)
    const report = { valid: true, messages: [] }

    if (!branchTicketNumber) {
        report.valid = false
        report.messages.push({ error: 'Branch needs to be named properly' })
    } else if (branchTicketNumber.length > 1) {
        // checks if PR is on the correct branch, returns a comment if not
        for (let number of branchTicketNumber) {
            // api call to associated ticket
            const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })

            // checks labels of associated ticket to PR
            for (let label of ticketAssociatedWithPullRequest.data.labels) {
                if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
                    report.valid = false
                }
            }
        }
        if (!report.valid) {
            report.messages.push({ error: 'Selected wrong branch' })
        }
    } else if (branchTicketNumber.length == 1) {
        const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })

        for (let label of ticketAssociatedWithPullRequest.data.labels) {
            if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
            report.valid = false
            report.messages.push({ error: 'Selected wrong branch' })
            }
        }
    }

    // check if there is a description in the PR
    if (!result.data.body.toLowerCase().includes('fixes #') || !result.data.body.toLowerCase().includes('test plan')) {
        report.valid = false
        report.messages.push({ error: 'Description incomplete, expects "fixes #<ticket number>" and "test plan".' })
    }

    console.log('errors', report.messages)
    // Final status
    await repos.createStatus({
        ...statusInfo,
        state: report.valid ? "success" : "failure",
        description: report.valid ? "No errors detected" : 'Errors have been detected'
    })

    // check if bot left previous comments
    const comments = await checkComments(issues, pull)

    // create comment if there are errors
    if (!report.valid) {
        const message = formatMessages(report.messages)
        if (comment) {
            // edits previous comment
            await issues.editComment({ ...pull, id: comments.id, body: message })
        } else {
            // create new comment
            await issues.createComment({ ...pull, body: message })
        }
    } else {
        // deletes previous comments if no errors found
        await issues.deleteComment({ ...pull, comment_id: comments.id})
    }

    // if (!branchTicketNumber) {
    //     const comment = context.issue({ body: 'Branch needs to be named properly' })
    //     return context.github.issues.createComment(comment)
    // } else if (branchTicketNumber.length > 1) {
    //     // checks if PR is on the correct branch, returns a comment if not
    //     for (let number of branchTicketNumber) {
    //         // api call to associated ticket
    //         const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: number })

    //         // checks labels of associated ticket to PR
    //         for (let label of ticketAssociatedWithPullRequest.data.labels) {
    //             if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
    //                 const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
    //                 return context.github.issues.createComment(pullRequestComment)
    //             }
    //         }
    //     }
    // } else if (branchTicketNumber.length == 1) {
    //     const ticketAssociatedWithPullRequest = await octokit.issues.get({ owner: 'lutan07', repo: repository.name, number: branchTicketNumber })

    //     for (let label of ticketAssociatedWithPullRequest.data.labels) {
    //         if (label.name === 'Release Branch' && result.data.base.label.includes('master')) {
    //         const pullRequestComment = context.issue({ body: 'Selected wrong branch' })
    //         return context.github.issues.createComment(pullRequestComment)
    //         }
    //     }
    // }

    // // check if there is a description in the PR
    // if (!result.data.body.toLowerCase().includes('fixes #') || !result.data.body.toLowerCase().includes('test plan')) {
    //     const descComment = context.issue({ body: 'Description incomplete, expects "fixes #<ticket number>" and "test plan".' })
    //     return context.github.issues.createComment(descComment)
    // }
}

module.exports = handlePullRequestOpenedChange