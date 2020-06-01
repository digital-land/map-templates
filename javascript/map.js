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

if (boundaries) {
  var geoBoundaries = L.geoJSON([boundaries], {
    style: {
      stroke: true,
      color: '#003078',
      weight: 2,
      opacity: 1,
      fill: true,
      fillOpacity: 0.2,
      fillColor: '#1d70b8'
    }
  })
  map.fitBounds(geoBoundaries.getBounds())
  geoBoundaries.addTo(map)
}
