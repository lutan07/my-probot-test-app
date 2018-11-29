const template = `
Please address the follow issues with this Pull Request:

<PLACEHOLDER>

`

function formatMessages(messages) {
    let message = ""

    messages.forEach(errMess => {
        message += `⚠ ${errMess.error} <br>`
    })

    return template.replace("<PLACEHOLDER>", message)
}

module.exports = formatMessages