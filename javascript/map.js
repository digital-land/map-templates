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
  var geoBoundaries = L.geoJSON([boundaries])
  map.fitBounds(geoBoundaries.getBounds())
  geoBoundaries.addTo(map)
}
