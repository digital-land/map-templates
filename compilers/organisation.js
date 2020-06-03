const fs = require('fs').promises
const path = require('path')
const nunjucks = require('nunjucks')
const utilities = require('./utilities.js')

const actions = {
  async generateTemplates (organisation, boundary) {
    const slug = `${organisation.organisation.replace(':', '/')}/map`
    const filepath = path.join(process.cwd(), `/docs/organisation/${slug}`)

    const macroFile = await fs.readFile(path.join(process.cwd(), '/templates/macro.njk'), 'utf8')
    const macroFileReplaced = macroFile.replace('{{ boundaries }}', JSON.stringify(boundary))
    const macro = await fs.writeFile(`${filepath}.njk`, macroFileReplaced).catch(error => console.log(error))

    const mapFile = nunjucks.render(path.join(process.cwd(), '/templates/map.njk'), {
      boundaries: boundary,
      points: false
    })
    const map = await fs.writeFile(`${filepath}.html`, mapFile).catch(error => console.log(error))

    return Promise.all([macro, map])
  }
};

(async () => {
  const organisations = await utilities.getAllOrganisations()
  for await (const organisation of organisations) {
    if (organisation['statistical-geography']) {
      const boundary = await utilities.getBoundary(organisation['statistical-geography'])

      // Only generate maps for organisations with a boundary
      if (boundary.features && boundary.features.length) {
        await actions.generateTemplates(organisation, [boundary])
      }
    }
  }
})()
