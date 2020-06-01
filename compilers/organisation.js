const csv = require('csv')
const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')

const actions = {
  async getAllOrganisations () {
    const organisations = fs.createReadStream(path.join(process.cwd(), '/organisation-dataset/collection/organisation.csv'))
      .pipe(csv.parse({ columns: true }))

    const array = []

    for await (const organisation of organisations) {
      array.push(organisation)
    }

    return array
  },
  async getBoundary (statisticalGeography) {
    const filepath = path.join(
      process.cwd(),
      `/boundaries-collection/collection/local-authority/${statisticalGeography}/index.geojson`
    )

    return fs.promises.readFile(filepath, 'utf8').then(contents => JSON.parse(contents)).catch(error => {
      if (error && error.code === 'ENOENT') {
        console.log(`No boundary for ${statisticalGeography}`)
      }
      return []
    })
  },
  async generateTemplates (organisation, boundary) {
    const slug = `${organisation.organisation.replace(':', '/')}/map`
    const filepath = path.join(process.cwd(), `/docs/organisation/${slug}`)

    const macroFile = await fs.promises.readFile(path.join(process.cwd(), '/templates/macro.njk'), 'utf8')
    const macroFileReplaced = macroFile.replace('{{ boundaries }}', JSON.stringify(boundary))
    const macro = await fs.promises.writeFile(`${filepath}.njk`, macroFileReplaced).catch(error => console.log(error))

    const mapFile = nunjucks.render(path.join(process.cwd(), '/templates/map.njk'), {
      boundaries: boundary
    })
    const map = await fs.promises.writeFile(`${filepath}.html`, mapFile).catch(error => console.log(error))

    return Promise.all([macro, map])
  }
};

(async () => {
  const organisations = await actions.getAllOrganisations()
  for await (const organisation of organisations) {
    if (organisation['statistical-geography']) {
      const boundary = await actions.getBoundary(organisation['statistical-geography'])

      // Only generate maps for organisations with a boundary
      if (boundary.features && boundary.features.length) {
        await actions.generateTemplates(organisation, boundary)
      }
    }
  }
})()
