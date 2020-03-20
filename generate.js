const fs = require('fs')
const csv = require('csvtojson')
const nunjucks = require('nunjucks')
const path = require('path')

const baseFile = 'src/base.njk'
const urlPrefix = process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : ''

const actions = {
  simplifyBrownfieldPoints (brownfields, strict) {
    const organisations = {}

    brownfields.forEach(function (row) {
      if (!Object.keys(organisations).includes(row['organisation'])) {
        organisations[row['organisation']] = []
      }

      var obj = row

      if (row.latitude && row.longitude) {
        if (strict) {
          var obj = {}
        }

        obj.size = row['hectares']
        obj.point = [row.longitude, row.latitude]

        organisations[row['organisation']].push(obj)
      }
    })

    return organisations
  },
  fixBoundaries (boundaries, organisations) {
    return {
      type: 'FeatureCollection',
      features: boundaries.map(function (boundary) {
        boundary.features = boundary.features.filter(function (feature) {
        // Only show boundaries in England
          return feature.properties.lad19cd.startsWith('E')
        }).map(function (feature) {
          var lad19cd = feature.properties.lad19cd

          // Fix LAD19CD numbers
          if (lad19cd === 'E06000057') {
          // Northumberland
            lad19cd = 'E06000048'
          } else if (lad19cd === 'E07000240') {
          // St Albans
            lad19cd = 'E07000100'
          } else if (lad19cd === 'E07000241') {
          // Welwyn Hatfield
            lad19cd = 'E07000104'
          } else if (lad19cd === 'E07000242') {
          // East Hertfordshire
            lad19cd = 'E07000097'
          } else if (lad19cd === 'E07000243') {
          // Stevenage
            lad19cd = 'E07000101'
          } else if (lad19cd === 'E08000037') {
          // Gateshead
            lad19cd = 'E08000020'
          }

          // Add organisation details to features
          var organisation = organisations.find(function (organisation) {
            if (organisation['statistical-geography'] && organisation['statistical-geography'].length) {
              return organisation['statistical-geography'].toString().toLowerCase() === lad19cd.toString().toLowerCase()
            }
          })

          feature.properties.organisation = organisation || false

          if (!feature.properties.organisation) {
            console.log('no organisation:', feature.properties)
          }

          return feature
        })

        return boundary
      })
    }
  },
  async generateByDataset (organisations, brownfields, boundaries) {
    const renderedDir = path.join(__dirname, '/docs/dataset/brownfield-land')
    const renderedPath = path.join(renderedDir, 'map.html')
    const renderedFile = nunjucks.render(baseFile, {
      data: {
        urlPrefix: urlPrefix,
        boundaries: boundaries,
        brownfield: actions.simplifyBrownfieldPoints(brownfields, true)
      }
    })

    fs.mkdirSync(renderedDir, { recursive: true })
    return fs.writeFileSync(renderedPath, renderedFile)
  },
  async generateByDatasetByOrganisation (organisations, brownfields, boundaries) {
    const simplifiedBrownfieldPoints = actions.simplifyBrownfieldPoints(brownfields, false)
    return organisations.forEach(organisation => {
      const renderedDir = path.join(__dirname, `/docs/dataset/brownfield-land/organisation/${organisation['organisation'].replace(':', '/')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      const statisticalGeography = organisation['statistical-geography']
      const singularBoundary = []

      if (statisticalGeography) {
        const boundaryPath = path.join(__dirname, `/boundaries-collection/collection/local-authority/${statisticalGeography}/index.geojson`)
        if (fs.existsSync(boundaryPath)) {
          singularBoundary.push(JSON.parse(fs.readFileSync(boundaryPath), 'utf8'))
        }
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix: urlPrefix,
          boundaries: (singularBoundary.length) ? actions.fixBoundaries(singularBoundary, organisations) : boundaries,
          brownfield: {
            [organisation['organisation']]: simplifiedBrownfieldPoints[organisation['organisation']]
          }
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

      const boundaries = []
      for (const geography of statisticalGeographies) {
        const geojsonFile = path.join(__dirname, `/boundaries-collection/collection/local-authority/${geography}/index.geojson`)
        if (fs.existsSync(geojsonFile)) {
          boundaries.push(JSON.parse(fs.readFileSync(geojsonFile, 'utf8')))
        }
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix: urlPrefix,
          boundaries: actions.fixBoundaries(boundaries, organisations),
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
  const fixedBoundaries = actions.fixBoundaries([boundaries], organisations)

  await actions.generateByDataset(organisations, brownfields, fixedBoundaries)
  await actions.generateByDatasetByOrganisation(organisations, brownfields, fixedBoundaries)
  // await actions.generateByResource(organisations)
})()
