const fs = require('fs')
const csv = require('csvtojson')
const nunjucks = require('nunjucks')

const actions = {
  async generateByDataset () {
    const organisations = await csv().fromFile(__dirname + '/organisation-collection/collection/organisation.csv')
    const brownfields = await csv().fromFile(__dirname + '/brownfield-land-collection/index/dataset.csv')

    const boundariesJson = fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/generalised.geojson', 'utf8')
    const brownfieldJson = brownfields.map(function (row) {
      return {
        organisation: row.organisation,
        latitude: row.latitude,
        longitude: row.longitude,
        hectares: row.hectares,
        'end-date': row['end-date']
      }
    })

    const directory = __dirname + '/docs/dataset/brownfield-land'
    fs.writeFileSync(directory + '/map.html', nunjucks.render('src/base.njk', {
      data: {
        urlPrefix: process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : '',
        geojson: JSON.parse(boundariesJson),
        organisations: organisations,
        brownfield: brownfieldJson
      }
    }))
  },
  async generateByDatasetByOrganisation () {
    const organisations = await csv().fromFile(__dirname + '/organisation-collection/collection/organisation.csv')
    const brownfields = await csv().fromFile(__dirname + '/brownfield-land-collection/index/dataset.csv')

    organisations.forEach(function (organisation) {
      const directory = __dirname + '/docs/dataset/brownfield-land/organisation/' + organisation['organisation'].replace(':', '/')
      const statisticalGeography = organisation['statistical-geography']

      // Get data
      var boundariesJson = []
      if (fs.existsSync(__dirname + '/boundaries-collection/collection/local-authority/' + statisticalGeography + '/index.geojson')) {
        boundariesJson = fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/' + statisticalGeography + '/index.geojson', 'utf8')
      } else {
        boundariesJson = fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/generalised.geojson', 'utf8')
      }

      var brownfieldJson = brownfields.filter(function (item) {
        return item['organisation'] === organisation['organisation']
      })

      fs.mkdirSync(directory, { recursive: true })
      fs.writeFileSync(directory + '/map.html', nunjucks.render('src/base.njk', {
        data: {
          urlPrefix: process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : '',
          geojson: JSON.parse(boundariesJson),
          organisations: [organisation],
          brownfield: brownfieldJson
        }
      }))
    })
  },
  async generateByResource () {
    const resources = fs.readdirSync(__dirname + '/brownfield-land-collection/var/transformed')
    const organisations = await csv().fromFile(__dirname + '/organisation-collection/collection/organisation.csv')

    return Promise.all(resources.map(async function (resource) {
      const directory = __dirname + '/docs/resource/' + resource.replace('.csv', '')
      const resourceJson = await csv().fromFile(__dirname + '/brownfield-land-collection/var/transformed/' + resource)

      const organisationsAppearingInResource = [...new Set(resourceJson.map(function (row) {
        return row['organisation']
      }))]

      const statisticalGeographies = organisationsAppearingInResource.map(function (row) {
        const org = organisations.find(function (organisation) {
          return organisation['organisation'] === row
        })
        return org ? org['statistical-geography'] : null
      }).filter(function (row) {
        return row
      })

      var boundariesJson = []
      statisticalGeographies.forEach(function (sg) {
        if (fs.existsSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson')) {
          boundariesJson = JSON.parse(fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson', 'utf8'))
        }
      })

      // var boundariesJson = statisticalGeographies.map(async function (sg) {
      //   if (fs.existsSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson')) {
      //     return JSON.parse(fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson', 'utf8'))
      //   }
      // }).filter(function (row) {
      //   return row.length
      // })

      // const statisticalGeographies = organisationsAppearingInResource.map(function (row) {
      //   return organisations.find(function (organisation) {
      //     return organisation['organisation'] === row
      //   })['statistical-geography']
      // })

      // var filteredStatisticalGeographies = statisticalGeographies.filter(function (sg) {
      //   return fs.existsSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson')
      // })

      // if (filteredStatisticalGeographies.length) {
      //   boundariesJson = await Promise.all(filteredStatisticalGeographies.map(async function (sg) {
      //     // if (fs.existsSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson')) {
      //     return JSON.parse(fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/' + sg + '/index.geojson', 'utf8'))
      //     // }
      //   }))
      // } else {
      //   boundariesJson = JSON.parse(fs.readFileSync(__dirname + '/boundaries-collection/collection/local-authority/generalised.geojson', 'utf8'))
      // }

      fs.mkdirSync(directory, { recursive: true })
      fs.writeFileSync(directory + '/map.html', nunjucks.render('src/base.njk', {
        data: {
          urlPrefix: process.env.IS_PROD ? 'https://digital-land.github.io/map-templates' : '',
          geojson: boundariesJson,
          organisations: organisations.filter(function (organisation) {
            return (organisationsAppearingInResource.includes(organisation['organisation']))
          }),
          brownfield: resourceJson
        }
      }))
    }))
  },
  generateNationalMap () {

  }
}

actions.generateByDatasetByOrganisation()
actions.generateByResource()
actions.generateByDataset()
