// Tile layers
var tiles = L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

// Map setup
var latLng = L.latLng(52.561928, -1.464854)
var map = L.map('map', {
  center: latLng,
  zoom: 1,
  layers: [tiles],
  preferCanvas: true,
  fullscreenControl: true
})

// Sidebar
var sidebar = L.control.sidebar('sidebar', {
  position: 'right'
})

map.addControl(sidebar)

var geojson = L.geoJSON(boundaries, {
  style: {
    fillOpacity: 0,
    weight: 2,
    color: 'gray'
  },
  onEachFeature: function (feature, layer) {
    if (!feature.properties.organisation) {
      layer.setStyle({
        fillColor: 'red',
        fillOpacity: 0.25
      })
    } else {
      var brownfieldMarkers = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        spiderfyOnMaxZoom: false,
        removeOutsideVisibleBounds: true,
        animate: false,
        disableClusteringAtZoom: 11,
        maxClusterRadius: 600,
        singleMarkerMode: false
      })
      var brownfieldOnMap = L.geoJSON({
        type: 'FeatureCollection',
        features: brownfield[feature.properties.organisation.organisation].map(function (point) {
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: point.point
            },
            properties: {
              organisation: feature.properties.organisation.organisation,
              longitude: point.point[0],
              latitude: point.point[1],
              hectares: point.size
            }
          }
        })
      }, {
        pointToLayer: function (feature, latlng) {
          var size = isNaN(feature.properties.hectares) ? 100 : (Math.sqrt((feature.properties.hectares * 10000) / Math.PI))
          return L.circle(latlng, { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: size.toFixed(2) })
        },
        onEachFeature: function (feature, layer) {
          layer.on({
            click: function () {
              sidebar.setContent('<h2>Loading...</h2>')
              sidebar.show()

              return Papa.parse('https://raw.githubusercontent.com/digital-land/map/master/docs/data/brownfield/' + feature.properties.organisation.toLowerCase().replace(':', '-') + '.csv', {
                download: true,
                header: true,
                complete: function (results) {
                  var point = results.data.find(function (row) {
                    return (row.latitude === feature.properties.latitude.toString()) && (row.longitude === feature.properties.longitude.toString())
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

      brownfieldMarkers.addLayer(brownfieldOnMap)
      map.addLayer(brownfieldMarkers)
    }

    layer.on({
      mouseover: function () {
        this.setStyle({
          fillColor: 'black',
          fillOpacity: 0.25
        })
      },
      mouseout: function () {
        this.setStyle({
          fillColor: 'white',
          fillOpacity: 0
        })
      },
      click: function () {
        return map.fitBounds(layer.getBounds())
      }
    })
  }
}).addTo(map)

// Zoom into boundaries or points
map.fitBounds(geojson.getBounds())
