# Digital Land map templates
A proof-of-concept for splitting out maps into templates to be consumed by Nunjucks.

## Examples
### Brownfield land:
- [National map of brownfield land](https://digital-land.github.io/map-templates/dataset/brownfield-land/map.html)
- [Organisation map of brownfield land](https://digital-land.github.io/map-templates/dataset/brownfield-land/organisation/local-authority-eng/SLF/map.html)
- [Resource map of brownfield land (singular organisation)](https://digital-land.github.io/map-templates/resource/bdb8761a3efe999199cf6be196ea1d85a36c7d58987e2f208107e8086d36d9f6/map.html)
- [Resource map of brownfield land (multiple organisations)](https://digital-land.github.io/map-templates/resource/86dee119f806d0c7f62295e6aae502851827e848202c4e43e833126ed62773db/map.html)

### Dependencies
- [node](https://nodejs.org/) >= 10.x
- [http-server](https://www.npmjs.com/package/http-server) or any http server to expose the /docs folder to localhost

### Running map-templates
- Clone this repository and run `make init` to install dependencies, and fetch and update submodules
- Run `make build` to build a local version
- If you have http-server installed, run `make serve` and go to [http://localhost:8080](http://localhost:8080)

## Licence
The software in this project is open source and covered by a [LICENCE](LICENCE) file.

Individual datasets copied into this repository may have specific copyright and licensing, otherwise all content and data in this repository is [© Crown copyright](http://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/copyright-and-re-use/crown-copyright/) and available under the terms of the [Open Government 3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) licence.
