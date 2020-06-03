const csv = require('csv')
const fs = require('fs')
const path = require('path')

const utilities = {
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
  }
}

module.exports = utilities
