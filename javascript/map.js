var tiles = L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

var latLng = L.latLng(52.561928, -1.464854)
var map = L.map('map', {
  center: latLng,
  zoom: 5,
  layers: [tiles],
  preferCanvas: true
})

var boundsZoomLevels = []

if (boundaries && boundaries.length) {
  var geoBoundaries = L.geoJSON([], {
    style: {
      stroke: true,
      color: '#003078',
      weight: 2,
      opacity: 1,
      fill: true,
      fillOpacity: 0.2,
      fillColor: '#1d70b8'
    }
  }).addTo(map)

  for (var i = 0; i < boundaries.length; i++) {
    geoBoundaries.addData(boundaries[i])
  }

  map.fitBounds(geoBoundaries.getBounds())
}

if (points) {
  var group = points.map(function (point) {
    return L.circle([point.latitude, point.longitude], {
      color: '#594d00',
      fillColor: '#594d00',
      fillOpacity: 0.5,
      radius: point.hectares ? Math.sqrt((point.hectares * 10000) / Math.PI) : 100
    })
  })

  L.featureGroup(group).addTo(map)
}
