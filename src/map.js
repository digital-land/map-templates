// Tile layers
var tiles = L.tileLayer("https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// govuk consistent colours
var colours = {
  lightBlue: "#1d70b8",
  darkBlue: "#003078",
  brown: "#594d00",
  //warning_yellow: "#fff7bf"
  yellow_brown: "#a0964e"
};

// Map setup
var latLng = L.latLng(52.561928, -1.464854);
var map = L.map("map", {
  center: latLng,
  zoom: 5,
  layers: [tiles],
  preferCanvas: true,
  fullscreenControl: true
});

// Sidebar
var sidebar = L.control.sidebar("sidebar", {
  position: "right",
  className: "bfs-sidebar"
});

var tooltipTemplate =
  '<div class="bfs">' +
  "{hasEndDate}" +
  '<div class="bfs__header">' +
  '<span class="govuk-caption-s">{siteRef}</span>' +
  '<h3 class="govuk-heading-s bfs__addr">{address}</h3>' +
  "<span>From:" +
  "{ancherToOrg}" +
  "</span>" +
  "</div>" +
  '<div class="govuk-grid-row bfs__key-data">' +
  '<dl class="govuk-grid-column-one-half">' +
  "<dt>Hectare</dt>" +
  "<dd>{hectares}</dd>" +
  "</dl>" +
  '<dl class="govuk-grid-column-one-half">' +
  "<dt>Dwellings</dt>" +
  "<dd>{isRange}</dd>" +
  "</dl>" +
  "</div>" +
  '<div class="bfs__planning bfs__property-list">' +
  '<h4 class="govuk-heading-xs govuk-!-margin-top-2">Planning details</h4>' +
  "<dl>" +
  "<dt>Planning permission status:</dt>" +
  "<dd>{planningPermissionStatus}</dd>" +
  "</dl>" +
  "<dl>" +
  "<dt>Planning permission type:</dt>" +
  "<dd>{planningPermissionType}</dd>" +
  "</dl>" +
  "<dl>" +
  "<dt>Ownership:</dt>" +
  "<dd>{ownership}</dd>" +
  "</dl>" +
  "<dl>" +
  "<dt>Deliverable:</dt>" +
  "<dd>{deliverable}</dd>" +
  "</dl>" +
  "<dl>" +
  "<dt>Hazardous substances:</dt>" +
  "<dd>{hazardousSubstances}</dd>" +
  "</dl>" +
  "{sitePlanAnchor}" +
  "</div>" +
  '<div class="bfs__meta">' +
  '<h4 class="govuk-heading-xs">Metadata</h4>' +
  "<dl>" +
  "<dt>Latitude:</dt>" +
  "<dd>{latitude}</dd>" +
  "</dl>" +
  "<dl>" +
  "<dt>Longitude:</dt>" +
  "<dd>{longitude}</dd>" +
  "</dl>" +
  "{differentDates}" +
  "<dl>" +
  "<dt>Source:</dt>" +
  "<dd>{resourceAnchor}</dd>" +
  "</dl>" +
  "</div>" +
  "</div>";

function hasEndDate(data) {
  if (data["endDate"]) {
    return (
      '<span class="bfs__end-banner">End date: ' + data["endDate"] + "</span>"
    );
  }
  return "";
}

function makeAnchor(href, text) {
  return '<a class="govuk-link" href="' + href + '">' + text + "</a>";
}

function ancherToOrg(data) {
  var org_name = data["organisation"],
    url = "#";
  return '<a class="govuk-link" href="' + url + '">' + org_name + "</a>";
}

function sitePlanAnchor(data) {
  if (data["sitePlanUrl"]) {
    return makeAnchor(data["sitePlanUrl"], "See site plan");
  }
  return "";
}

function resourceAnchor(data) {
  var url = "https://digital-land.github.io/resource/" + data["resource"];
  var text = data["resource"].substring(0, 12) + "&hellip;";
  return makeAnchor(url, text);
}

function isRange(data) {
  var str = data["minDwell"];
  if (data["minDwell"] != null) {
    if (
      parseInt(data["minDwell"]) !== parseInt(data["maxDwell"]) ||
      parseInt(data["maxDwell"]) === 0
    ) {
      str = data["minDwell"] + "-" + data["maxDwell"];
    }
    return str;
  }
  return "";
}

function differentDates(data) {
  var str =
    "<dl>" +
    "<dt>Date added:</dt>" +
    "<dd>" +
    data["startDate"] +
    "</dd>" +
    "</dl>";
  if (data["startDate"] != data["updatedDate"]) {
    return (
      str +
      "<dl>" +
      "<dt>Last updated:</dt>" +
      "<dd>" +
      data["updatedDate"] +
      "</dd>" +
      "</dl>"
    );
  }
  return str;
}

function createSidebarContent(row) {
  console.log(row);
  processed_row_data = {
    address: row["site-address"],
    siteRef: row["site"],
    endDate: row["end-date"],
    hectares: row["hectares"],
    minDwell: row["minimum-net-dwellings"],
    maxDwell: row["maximum-net-dwellings"],
    latitude: row["latitude"],
    longitude: row["longitude"],
    startDate: row["start-date"],
    updatedDate: row["entry-date"],
    organisation: row["organisation"],
    planningPermissionStatus: row["planning-permission-status"],
    planningPermissionType: row["planning-permission-type"],
    ownership: row["ownership"],
    deliverable: row["deliverable"] || "n/a",
    hazardousSubstances: row["hazardous-substances"] || "n/a",
    sitePlanUrl: row["site-plan-url"],
    resource: row["resource"],
    //rowNumber: row["row_number"],
    isRange: isRange,
    hasEndDate: hasEndDate,
    differentDates: differentDates,
    ancherToOrg: ancherToOrg,
    sitePlanAnchor: sitePlanAnchor,
    resourceAnchor: resourceAnchor
  };
  return L.Util.template(tooltipTemplate, processed_row_data);
}

map.addControl(sidebar);

var geoBoundaries = L.geoJSON(boundaries, {
  style: {
    fillOpacity: 0.2,
    weight: 2,
    color: colours.darkBlue,
    fillColor: colours.lightBlue
  },
  onEachFeature: function(feature, layer) {
    if (!feature.properties.organisation) {
      return layer.setStyle({
        fillColor: colours.brown,
        fillOpacity: 0.25
      });
    }

    var brownfieldPoints = brownfield[
      feature.properties.organisation.organisation
    ]
      ? brownfield[feature.properties.organisation.organisation]
      : [];

    // separate records based on presence of end-date vale
    function extractBrownfields(arr, historical) {
      var reduced_arr = arr.filter(function(site) {
        if (site['end-date']) {
          return (historical) ? true : false;
        }
        return (historical) ? false : true;
      });
      return reduced_arr;
    }

    var currentBrownfieldPoints = extractBrownfields(brownfieldPoints);
    var historicalBrownfieldPoints = extractBrownfields(brownfieldPoints, true);

    var geoPoints = L.geoJSON(
      {
        type: "FeatureCollection",
        features: currentBrownfieldPoints.map(function(point) {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point.point
            },
            properties: {
              size: point.size
                ? Math.sqrt((point.size * 10000) / Math.PI)
                : 100,
              organisation: feature.properties.organisation.organisation
            }
          };
        })
      },
      {
        pointToLayer: function(feature) {
          return L.circle(feature.geometry.coordinates, {
            color: colours.brown,
            fillColor: colours.brown,
            fillOpacity: 0.5,
            radius: feature.properties.size.toFixed(2)
          });
        },
        onEachFeature: function(feature, layer) {
          return layer.on({
            click: function() {
              sidebar.setContent("<h2>Loading...</h2>");
              sidebar.show();

              if (mapIsLocal) {
                var point = brownfield[feature.properties.organisation].find(
                  function(row) {
                    return (
                      row["latitude"] ===
                        feature.geometry.coordinates[0].toString() &&
                      row["longitude"] ===
                        feature.geometry.coordinates[1].toString()
                    );
                  }
                );

                var content = "";

                if (point) {
                  // Object.keys(point).forEach(function(key) {
                  //   content = content + key + ": " + point[key] + "<br>";
                  // });
                  content = createSidebarContent(point);
                } else {
                  content =
                    "<h2>Point not found - debug info:</h2><pre>" +
                    JSON.stringify(results.data) +
                    "</pre><h3>Looking for a row with latitude, longitude:</h3>" +
                    feature.geometry.coordinates[0].toString() +
                    "," +
                    feature.geometry.coordinates[1].toString();
                }

                return sidebar.setContent(content);
              }

              // Could be smarter here and fill an object to stop loading if more than one point is clicked
              return Papa.parse(
                "https://raw.githubusercontent.com/digital-land/map/master/docs/data/brownfield/" +
                  feature.properties.organisation
                    .toLowerCase()
                    .replace(":", "-") +
                  ".csv",
                {
                  download: true,
                  header: true,
                  complete: function(results) {
                    var point = results.data.find(function(row) {
                      return (
                        row.latitude ===
                          feature.geometry.coordinates[0].toString() &&
                        row.longitude ===
                          feature.geometry.coordinates[1].toString()
                      );
                    });

                    var content = "";

                    if (point) {
                      content = createSidebarContent(point);
                    } else {
                      content =
                        "<h2>Point not found - debug info:</h2><pre>" +
                        JSON.stringify(results.data) +
                        "</pre><h3>Looking for a row with latitude, longitude:</h3>" +
                        feature.geometry.coordinates[0].toString() +
                        "," +
                        feature.geometry.coordinates[1].toString();
                    }

                    sidebar.setContent(content);
                  }
                }
              );
            }
          });
        }
      }
    );

    var geoPointsHist = L.geoJSON(
      {
        type: "FeatureCollection",
        features: historicalBrownfieldPoints.map(function(point) {
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point.point
            },
            properties: {
              size: point.size
                ? Math.sqrt((point.size * 10000) / Math.PI)
                : 100,
              organisation: feature.properties.organisation.organisation
            }
          };
        })
      },
      {
        pointToLayer: function(feature) {
          return L.circle(feature.geometry.coordinates, {
            color: colours.yellow_brown,
            fillColor: colours.yellow_brown,
            fillOpacity: 0.5,
            radius: feature.properties.size.toFixed(2)
          });
        },
        onEachFeature: function(feature, layer) {
          return layer.on({
            click: function() {
              sidebar.setContent("<h2>Loading...</h2>");
              sidebar.show();

              if (mapIsLocal) {
                var point = brownfield[feature.properties.organisation].find(
                  function(row) {
                    return (
                      row["latitude"] ===
                        feature.geometry.coordinates[0].toString() &&
                      row["longitude"] ===
                        feature.geometry.coordinates[1].toString()
                    );
                  }
                );

                var content = "";

                if (point) {
                  // Object.keys(point).forEach(function(key) {
                  //   content = content + key + ": " + point[key] + "<br>";
                  // });
                  content = createSidebarContent(point);
                } else {
                  content =
                    "<h2>Point not found - debug info:</h2><pre>" +
                    JSON.stringify(results.data) +
                    "</pre><h3>Looking for a row with latitude, longitude:</h3>" +
                    feature.geometry.coordinates[0].toString() +
                    "," +
                    feature.geometry.coordinates[1].toString();
                }

                return sidebar.setContent(content);
              }

              // Could be smarter here and fill an object to stop loading if more than one point is clicked
              return Papa.parse(
                "https://raw.githubusercontent.com/digital-land/map/master/docs/data/brownfield/" +
                  feature.properties.organisation
                    .toLowerCase()
                    .replace(":", "-") +
                  ".csv",
                {
                  download: true,
                  header: true,
                  complete: function(results) {
                    var point = results.data.find(function(row) {
                      return (
                        row.latitude ===
                          feature.geometry.coordinates[0].toString() &&
                        row.longitude ===
                          feature.geometry.coordinates[1].toString()
                      );
                    });

                    var content = "";

                    if (point) {
                      content = createSidebarContent(point);
                    } else {
                      content =
                        "<h2>Point not found - debug info:</h2><pre>" +
                        JSON.stringify(results.data) +
                        "</pre><h3>Looking for a row with latitude, longitude:</h3>" +
                        feature.geometry.coordinates[0].toString() +
                        "," +
                        feature.geometry.coordinates[1].toString();
                    }

                    sidebar.setContent(content);
                  }
                }
              );
            }
          });
        }
      }
    );

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
    .addLayer(geoPoints)
    .addLayer(geoPointsHist);

    map.addLayer(brownfieldMarkers);
  }
}).addTo(map);

map.fitBounds(geoBoundaries.getBounds());
