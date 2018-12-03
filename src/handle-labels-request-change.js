async function handleLabelsRequestChange(context) {
    
    const { label, issue, repository } = context.payload
    const { issues } = context.github
    
    if (label.name === 'Failed Release QA') {
        // Get the issue that has been moved to Failed Release QA
        const result = await issues.get({ owner: issue.user.login, repo: repository.name, number: issue.number })

        for (let label of result.data.labels) {
            if (label.name.startsWith('Priority')) {
                // Remove original priority label
                const removePriLabelResult = await issues.removeLabel({ owner: issue.user.login , repo: repository.name, number: issue.number , name: label.name })
            }
        }

        // Add Remediation and Release Branch Label 
        const addLabelResult = await issues.addLabels({ owner: issue.user.login, repo: repository.name, number: issue.number, labels: ['Remediation', 'Release Branch', 'Priority: 1-Critical'] })

        // Remove Failed Release QA Label
        const removeLabelResult = await issues.removeLabel({ owner: issue.user.login , repo: repository.name, number: issue.number , name: ['Failed Release QA'] })

        // Open ticket if closed
        if (issue.state === "closed") {
        const changeIssueState = await issues.update({ owner: issue.user.login, repo: repository.name, number: issue.number, state: 'open'})
        }
    }
}

module.exports = handleLabelsRequestChange