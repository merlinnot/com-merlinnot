# com-merlinnot

Personal website of the author, Natan Sągol. Created mostly to take the art
of programming to perfection, taking great care of every single detail.

Previously implemented in [Haskell](https://www.haskell.org) using [Yesod
Web Framework](https://www.yesodweb.com), some leftovers can be found
[here](https://github.com/merlinnot/surreal).

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development and testing purposes. See deployment for notes on
how to deploy the project on a live system.

### Prerequisites

Minimal requirements to set up the project:

- [Node.js](https://nodejs.org/en) v10, installation instructions can be
  found on the official website, I can personally recommend using
  [Node Version Manager](https://github.com/creationix/nvm#readme). It can
  be installed in
  a [few commands](https://nodejs.org/en/download/package-manager/#nvm).
- A package manager like [Yarn](https://yarnpkg.com) or
  [NPM](https://www.npmjs.com). All instructions in the documentation will
  follow the NPM syntax.
- Optionally a [Git](https://git-scm.com) client.

### Installing

Start by cloning the repository:

```bash
git clone git@github.com:merlinnot/com-merlinnot.git
```

In case you don't have a git client, you can get the latest version directly
using [this link](https://github.com/merlinnot/com-merlinnot/archive/master.zip)
and extracting the downloaded archive.

Go the the right directory and install dependencies:

```bash
cd com-merlinnot
npm install
```

That's it! You can now go to the next step.

### Local development server

[Gulp](http://gulpjs.com) is a tool of choice to run both development and
build tasks. For convenience purposes some tasks are exported as NPM scripts,
including starting the development server:

```bash
npm run start:dev
```

You can now access the website at [localhost:8080](http://localhost:8080).

Development server will automatically rebuild the website when `.sass` or `.pug`
files are being modified, however images and manifest files will be build only
once.

## Tests

### Accelerated Mobile Pages compliance

Compliance check is baked into the development server, you can see all of the
errors in the console. Validation is also being performed at build time,
failing the build in case of errors.

### Formatting

This project uses [Prettier](https://prettier.io) to automate formatting. All
supported files in use are being reformatted in a precommit hook. You can
also use two scripts to validate and optionally fix all of the files:

```bash
npm run format
npm run format:fix
```

## Deployment

Deployment is handled in an automated way and must not be performed manually.
For each PR a staging environment is created and a corresponding link is added
as a validation check. Staging environment can be used to play with a new
version and to make sure it looks exactly as it should.

## Built with

### Runtime libraries

- [Accelerated Mobile Pages](https://www.ampproject.org)

### Source

- [Pug](https://pugjs.org)
- [Sass](https://sass-lang.com)

### Preprocessing

- [cssnano](https://cssnano.co)
- [PostCSS](https://postcss.org)
- [Sharp](http://sharp.pixelplumbing.com)

### Development

- [Browsersync](https://browsersync.io)

### Orchestration

- [Gulp](https://gulpjs.com)

### Automation

- [CircleCI](https://circleci.com)
- [Netlify](https://www.netlify.com)
- [Renovate](https://renovatebot.com)

### Delivery

- [Firebase](https://firebase.google.com)

## Versioning

This project adheres to [SemVer](http://semver.org) v2.

## License

This project is licensed under the MIT License - see the
[LICENSE.md](LICENSE.md) file for details.
