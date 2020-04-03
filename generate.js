const fs = require('fs')
const csv = require('csvtojson')
const nunjucks = require('nunjucks')
const path = require('path')

const baseFile = 'src/base.njk'
const urlPrefix = process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : ''

const actions = {
  simplifyDataPoints (organisations, brownfields, strict) {
    const data = {}

    organisations.forEach(organisation => {
      data[organisation['organisation']] = []
    })

    brownfields.forEach(brownfield => {
      let obj = brownfield
      if (strict) {
        obj = {}
      }

      // Add point
      let point = []
      if (!isNaN(parseFloat(brownfield['latitude'])) && !isNaN(parseFloat(brownfield['longitude']))) {
        point = [parseFloat(brownfield['latitude']), parseFloat(brownfield['longitude'])]
      }
      obj.point = point

      // Add hectares
      obj.size = isNaN(parseFloat(brownfield['hectares'])) ? 0 : parseFloat(brownfield['hectares'])

      if (!Object.keys(data).includes(brownfield['organisation'])) {
        data[brownfield['organisation']] = []
      }

      if (obj.point.length) {
        data[brownfield['organisation']].push(obj)
      }
    })

    return data
  },
  simplifyBoundaries (organisations, boundaries) {
    return {
      type: 'FeatureCollection',
      features: boundaries.features.filter(feature => feature.properties.lad19cd.startsWith('E')).map(feature => {
        const organisation = organisations.find(organisation => {
          let lad19cd = feature.properties.lad19cd

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

          return lad19cd === organisation['statistical-geography']
        }) || {}

        const organisationObj = {}

        Object.keys(organisation).forEach(key => {
          if (key === 'organisation' || key === 'name') {
            organisationObj[key] = organisation[key]
          }
        })

        return {
          type: 'Feature',
          properties: {
            lad19cd: feature.properties.lad19cd,
            organisation: organisationObj
          },
          geometry: feature.geometry
        }
      })
    }
  },
  async generateByDataset (organisations, brownfields, boundaries) {
    console.log('National dataset: generating map')
    const renderedDir = path.join(__dirname, '/docs/dataset/brownfield-land')
    const renderedPath = path.join(renderedDir, 'map.html')

    const renderedFile = nunjucks.render(baseFile, {
      data: {
        urlPrefix,
        boundaries: actions.simplifyBoundaries(organisations, boundaries),
        brownfield: brownfields,
        mapIsLocal: false
      }
    })

    fs.mkdirSync(renderedDir, { recursive: true })
    console.log('National dataset: finished generating map')
    return fs.writeFileSync(renderedPath, renderedFile)
  },
  async generateByDatasetByOrganisation (organisations, brownfields, boundaries) {
    const simplifiedBoundaries = actions.simplifyBoundaries(organisations, boundaries)

    return organisations.forEach(organisation => {
      console.log(`Brownfield by organisation: generating ${organisation.organisation} map`)
      const renderedDir = path.join(__dirname, `/docs/dataset/brownfield-land/organisation/${organisation['organisation'].replace(':', '/')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      let singularBoundary = false

      if (organisation['statistical-geography']) {
        const boundaryPath = path.join(__dirname, `/boundaries-collection/collection/local-authority/${organisation['statistical-geography']}/index.geojson`)
        if (fs.existsSync(boundaryPath)) {
          singularBoundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'))
        }
      }

      if (!singularBoundary && organisation['statistical-geography']) {
        console.log(organisation.organisation, organisation['statistical-geography'], ': no boundary present')
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix,
          boundaries: singularBoundary ? actions.simplifyBoundaries(organisations, singularBoundary) : simplifiedBoundaries,
          brownfield: {
            [organisation.organisation]: brownfields[organisation.organisation]
          },
          mapIsLocal: true
        }
      })

      console.log(`Brownfield by organisation: finished generating ${organisation.organisation} map`)
      fs.mkdirSync(renderedDir, { recursive: true })
      return fs.writeFileSync(renderedPath, renderedFile)
    })
  },
  async generateByResource (organisations) {
    const resourcesDir = path.join(__dirname, '/brownfield-land-collection/var/transformed')
    const resources = fs.readdirSync(resourcesDir).filter(file => file.endsWith('.csv'))

    return Promise.all(resources.map(async resource => {
      console.log('Brownfield by resource: generating map for', resource)
      const renderedDir = path.join(__dirname, `/docs/resource/${resource.replace('.csv', '')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      const resourceJson = await csv().fromFile(path.join(resourcesDir, resource))

      const organisationsAppearing = [...new Set(resourceJson.map(row => row['organisation']))].filter(row => row)

      const statisticalGeographies = [...new Set(organisationsAppearing.map(row => {
        const organisation = organisations.find(organisation => organisation['organisation'] === row)

        return organisation ? organisation['statistical-geography'] : false
      }))].filter(row => row)

      const boundaries = []
      for (const geography of statisticalGeographies) {
        const geojsonFile = path.join(__dirname, `/boundaries-collection/collection/local-authority/${geography}/index.geojson`)
        if (fs.existsSync(geojsonFile)) {
          boundaries.push(JSON.parse(fs.readFileSync(geojsonFile, 'utf8')))
        }
      }

      const groupedBoundaries = {
        type: 'FeatureCollection',
        features: boundaries.map(boundary => boundary.features).flat()
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix,
          boundaries: actions.simplifyBoundaries(organisations, groupedBoundaries),
          brownfield: actions.simplifyDataPoints(organisations, resourceJson, false),
          mapIsLocal: true
        }
      })

      fs.mkdirSync(renderedDir, { recursive: true })
      console.log('Brownfield by resource: finished map for', resource)
      return fs.writeFileSync(renderedPath, renderedFile)
    }))
  },
  async generateByOrganisation (organisations, boundaries) {
    const simplifiedBoundaries = actions.simplifyBoundaries(organisations, boundaries)

    return organisations.forEach(function (organisation) {
      console.log(`Organisation: generating blank ${organisation.organisation} map`)

      const renderedDir = path.join(__dirname, `/docs/organisation/${organisation['organisation'].replace(':', '/')}`)
      const renderedPath = path.join(renderedDir, '/map.html')
      let singularBoundary = false

      if (organisation['statistical-geography']) {
        const boundaryPath = path.join(__dirname, `/boundaries-collection/collection/local-authority/${organisation['statistical-geography']}/index.geojson`)
        if (fs.existsSync(boundaryPath)) {
          singularBoundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'))
        }
      }

      if (!singularBoundary && organisation['statistical-geography']) {
        console.log(organisation.organisation, organisation['statistical-geography'], ': no boundary present')
      }

      const renderedFile = nunjucks.render(baseFile, {
        data: {
          urlPrefix,
          boundaries: singularBoundary ? actions.simplifyBoundaries(organisations, singularBoundary) : simplifiedBoundaries,
          brownfield: [],
          mapIsLocal: true
        }
      })

      console.log(`Organisation: finished generating blank ${organisation.organisation} map`)
      fs.mkdirSync(renderedDir, { recursive: true })
      return fs.writeFileSync(renderedPath, renderedFile)
    })
  }
};

(async () => {
  const organisations = await csv().fromFile(path.join(__dirname, '/organisation-collection/collection/organisation.csv'))
  const brownfields = await csv().fromFile(path.join(__dirname, '/brownfield-land-collection/index/dataset.csv'))
  const boundaries = JSON.parse(fs.readFileSync(path.join(__dirname, '/boundaries-collection/collection/local-authority/generalised.geojson'), 'utf8'))

  const simplifiedDataPointsRemote = actions.simplifyDataPoints(organisations, brownfields, true)
  const simplifiedDataPointsLocal = actions.simplifyDataPoints(organisations, brownfields, false)

  await actions.generateByDataset(organisations, simplifiedDataPointsRemote, boundaries)
  await actions.generateByDatasetByOrganisation(organisations, simplifiedDataPointsLocal, boundaries)
  await actions.generateByResource(organisations)
  await actions.generateByOrganisation(organisations, boundaries)
})()
