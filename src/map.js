// Tile layers
var tiles = L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

// Map setup
var latLng = L.latLng(52.561928, -1.464854)
var map = L.map('map', {
  center: latLng,
  zoom: 5,
  layers: [tiles],
  preferCanvas: true,
  fullscreenControl: true
})

// Sidebar
var sidebar = L.control.sidebar('sidebar', {
  position: 'right'
})

map.addControl(sidebar)

var geoBoundaries = L.geoJSON(boundaries, {
  style: {
    fillOpacity: 0,
    weight: 2,
    color: 'gray'
  },
  onEachFeature: function (feature, layer) {
    if (!feature.properties.organisation) {
      return layer.setStyle({
        fillColor: 'red',
        fillOpacity: 0.25
      })
    }

    var brownfieldPoints = brownfield[feature.properties.organisation.organisation] ? brownfield[feature.properties.organisation.organisation] : []
    var geoPoints = L.geoJSON({
      type: 'FeatureCollection',
      features: brownfieldPoints.map(function (point) {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: point.point
          },
          properties: {
            size: point.size ? (Math.sqrt((point.size * 10000) / Math.PI)) : 100,
            organisation: feature.properties.organisation.organisation
          }
        }
      })
    }, {
      pointToLayer: function (feature) {
        return L.circle(feature.geometry.coordinates, { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: feature.properties.size.toFixed(2) })
      },
      onEachFeature: function (feature, layer) {
        return layer.on({
          click: function () {
            sidebar.setContent('<h2>Loading...</h2>')
            sidebar.show()

            // Could be smarter here and fill an object to stop loading if more than one point is clicked
            return Papa.parse('https://raw.githubusercontent.com/digital-land/map/master/docs/data/brownfield/' + feature.properties.organisation.toLowerCase().replace(':', '-') + '.csv', {
              download: true,
              header: true,
              complete: function (results) {
                var point = results.data.find(function (row) {
                  return (row.latitude === feature.geometry.coordinates[0].toString() && row.longitude === feature.geometry.coordinates[1].toString())
                })

                var content = ''

                if (point) {
                  Object.keys(point).forEach(function (key) {
                    content = content + key + ': ' + point[key] + '<br>'
                  })
                } else {
                  content = '<h2>Point not found - debug info:</h2><pre>' + JSON.stringify(results.data) + '</pre><h3>Looking for a row with latitude, longitude:</h3>' + feature.properties.latitude.toString() + ',' + feature.properties.longitude.toString()
                }

                sidebar.setContent(content)
              }
            })
          }
        })
      }
    })

    var brownfieldMarkers = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: false,
      removeOutsideVisibleBounds: true,
      animate: false,
      disableClusteringAtZoom: 11,
      maxClusterRadius: 600,
      singleMarkerMode: false
    }).addLayer(geoPoints)

    map.addLayer(brownfieldMarkers)
  }
}).addTo(map)

map.fitBounds(geoBoundaries.getBounds())
