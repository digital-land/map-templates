const fs = require('fs')
const csv = require('csvtojson')
const nunjucks = require('nunjucks')
const path = require('path')

const baseFile = 'src/base.njk'
const urlPrefix = process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : ''

const actions = {
  async generateByDataset (organisations, brownfields, boundaries) {
    const renderedDir = path.join(__dirname, '/docs/dataset/brownfield-land')
    const renderedPath = path.join(renderedDir, 'map.html')
    const renderedFile = nunjucks.render(baseFile, {
      data: {
        urlPrefix: urlPrefix,
        geojson: boundaries,
        organisations: organisations,
        brownfield: brownfields.map(row => ({
          organisation: row.organisation,
          latitude: row.latitude,
          longitude: row.longitude,
          hectares: row.hectares,
          'end-date': row['end-date']
        }))
      }
    })

    fs.mkdirSync(renderedDir, { recursive: true })
    return fs.writeFileSync(renderedPath, renderedFile)
  },
  async generateByDatasetByOrganisation (organisations, brownfields, boundaries) {
    return organisations.forEach(organisation => {
      const renderedDir = path.join(__dirname, `/docs/dataset/brownfield-land/organisation/${organisation['organisation'].replace(':', '/')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      const statisticalGeography = organisation['statistical-geography']
      let singularBoundary = false

      if (statisticalGeography) {
        const boundaryPath = path.join(__dirname, `/boundaries-collection/collection/local-authority/${statisticalGeography}/index.geojson`)
        if (fs.existsSync(boundaryPath)) {
          singularBoundary = JSON.parse(fs.readFileSync(boundaryPath), 'utf8')
        }
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix: urlPrefix,
          geojson: singularBoundary || boundaries,
          organisations: [organisation],
          brownfield: brownfields.filter(item => item['organisation'] === organisation['organisation'])
        }
      })

      fs.mkdirSync(renderedDir, { recursive: true })
      return fs.writeFileSync(renderedPath, renderedFile)
    })
  },
  async generateByResource (organisations) {
    const resourcesDir = path.join(__dirname, '/brownfield-land-collection/var/transformed')

    const resources = fs.readdirSync(resourcesDir).filter(file => file.endsWith('.csv'))

    return Promise.all(resources.map(async resource => {
      const renderedDir = path.join(__dirname, `/docs/resource/${resource.replace('.csv', '')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      const resourceJson = await csv().fromFile(path.join(resourcesDir, resource))

      const organisationsAppearing = [...new Set(resourceJson.map(row => row['organisation']))].filter(row => row)

      const statisticalGeographies = organisationsAppearing.map(row => {
        const organisation = organisations.find(organisation => organisation['organisation'] === row)

        return organisation ? organisation['statistical-geography'] : false
      }).filter(row => row)

      let boundaries = []
      for (const geography of statisticalGeographies) {
        const geojsonFile = path.join(__dirname, `/boundaries-collection/collection/local-authority/${geography}/index.geojson`)
        if (fs.existsSync(geojsonFile)) {
          boundaries = JSON.parse(fs.readFileSync(geojsonFile, 'utf8'))
        }
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix: urlPrefix,
          geojson: boundaries,
          organisations: organisations.filter(organisation => organisationsAppearing.includes(organisation['organisation'])),
          brownfield: resourceJson
        }
      })

      fs.mkdirSync(renderedDir, { recursive: true })
      return fs.writeFileSync(renderedPath, renderedFile)
    }))
  }
};

(async () => {
  const organisations = await csv().fromFile(path.join(__dirname, '/organisation-collection/collection/organisation.csv'))
  const brownfields = await csv().fromFile(path.join(__dirname, '/brownfield-land-collection/index/dataset.csv'))
  const boundaries = JSON.parse(fs.readFileSync(path.join(__dirname, '/boundaries-collection/collection/local-authority/generalised.geojson'), 'utf8'))

  await actions.generateByDataset(organisations, brownfields, boundaries)
  await actions.generateByDatasetByOrganisation(organisations, brownfields, boundaries)
  await actions.generateByResource(organisations)
})()
