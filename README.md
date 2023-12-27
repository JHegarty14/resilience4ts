# resilience4ts

`resilience4ts` is a package that provides ergonomic tools for building performant and safe distributed systems in Typescript. Unlike existing Typescript ports of Java libraries like Hystrix and resilience4j, or .NET packages like Polly, is designed to be used specifically in a highly-concurrent, distributed applications.

## Usage

To create or work on packages in this repo, first make sure you are using node >=16 and have the package manager `pnpm` installed. Use [pnpm](https://pnpm.io/workspaces) anywhere you'd normally use npm when developing in the repo.

```bash
nvm use && npm i -g pnpm@latest
pnpm install
```

### New package setup

To create a new package, you should create a new folder in the packages directory. The folder name should match what the published package will be called, after removing `@forts/resilience4ts-` from the name. E.g. `@forts/resilience4ts-core` is in the `packages/core` folder.

Next, copy the boilerplate files from the template folder into your new package folder. Update the name in the package.json to your package's name.

Finally, add the appropriate path and references to the tsconfig.json in the root folder of this project. This allows IDE integration, CI builds, and testing to function properly.

At this point, the package is ready for development.

### Package Development

There are important differences to be aware of and subsequent rules to follow when working in a monorepo. First, the repo uses a [trunk based development model](https://trunkbaseddevelopment.com/), there is no 'development' branch, rather, the master branch is the single main branch, and therefore the master branch must only contain ready to publish code.

Because many packages within this repo use and import one another, a tool called `changesets` is used to more granularly track changes within each package, so that when new versions of a package are released, dependent packages will also release updated versions.

As a developer, what this means is that each time before a PR is opened, after all other code changes have been committed, the following action should take place:

NOTE: Do not manually update the version as you can follow the instructions below

In the console, run the following command:

```sh
pnpm changeset
```

The changesets CLI will display the prompts needed to update the repo, first select the package being updated, and then select the level of version bump that is required. Because this repo's packages strictly follow [semver](https://semver.org/), it is important to think through and properly test what effect these changes will have on consuming applications. Use the following guidelines when making that decision.

```txt
MAJOR version when you make incompatible API changes
MINOR version when you add functionality in a backwards compatible manner
PATCH version when you make backwards compatible bug fixes
```

A new changeset file will be created. You will need to add/commit/push that file to the server, and it will automatically be deleted once it is officially released via github action on master branch merge.

### Publishing

After merging a PR to the master branch, a changeset repo bot will create a new PR that handles bumping version numbers of all packages that are specified, including dependent packages. The PR will remain open and auto-update anytime new PR's are merged to the master branch. When it is time to publish a new or updated package, 2 approvals will be needed for the version package PR, once it is approved and merged our CI/CD pipeline will check the version of each package in the repo, and publish all packages that have new versions. Per Built's reference architechture, versioned package repos do not require a CAB doc, instead changes will be referenced when consuming applications update to new versions.

### Prerelease / Package Testing

When developing a new package, it is important to fully test the final output of the package, to make sure that functionality as well as declaration typings have been properly exported. For that purpose, this repo can also publish a prerelease / canary / beta version of a package on demand, allowing the package to be installed exactly as it would be in a stable release.

To publish a prerelease package, first navigate to that packages's root folder and run the following command `npm version prerelease --preid alpha`. This will update the package version to a new patch version concatenated with an alpha suffix, so do not manually change the version yourself.

#### Example

```ts
cd ./packages/caching && npm version prerelease --preid alpha
// If your package version was 0.0.6, the command above will update it to 0.0.7-alpha.0
// If you execute "npm version prerelease --preid alpha" again, it will update it to 0.0.7-alpha.1
// It is useful to use this command to bump your versions in between changes you want to test throughout your package development
```

Once you have executed the command to bump your version for pre-release, you can add/commit/push that change to the server. Once that is done, you can go to the rundeck job [prerelease package branch](https://infrastructure.getbuilt.com/rundeck/project/development/job/show/2DE8AF3A-150F-453B-8001-5A65D83CFE20) to point the `resilience4ts` repo to your working branch. This will kick off the prerelease package pipeline, which will publish the package to nexus with a --next tag. Afterwards, a consuming application can install the package similarly referencing the next tag.

```ts
npm install @forts/resilience4ts-core@next
```

Once you have executed the rundeck for the first time, you do not need to run it manually again. It will automatically run once you add/commit/push an updated prerelease version in your package.json.

Assuming you already ran the rundeck manually once, you can follow the instructions below for continuous development.

1. Make changes to the package (e.g. logger, etc)
2. Bump your version to the next pre-release via `npm version prerelease --preid alpha`
3. Git add/commit/push
4. Test out the prerelease package that was deployed from the previous step via `npm install @forts/resilience4ts-core@next`
5. Repeat steps 1-4 as needed

When you are done with development/testing, you should manually set the version of the package you are working on to what it was originally (e.g. 0.0.6). You must do this before you consider merging your PR since we have other processes in place to take care of official release. See Publishing section in this README for details on how to do that.

NOTE: While working on your branch, do not push a commit with an official version semantic (e.g. major.minor.patch) unless you are finalizing your PR for merge; make sure you are referencing the original version if so. If you push a commit with a new official version (e.g. 0.0.7) that has not been published before, then that version will be taged as a prerelease version.

## Things to know before contributing

### Build Tools

This repo uses Typescript's composite functionality to independently build each project in its own dist folder. Packages can reference each other within the workspace by properly extending the root tsconfig file, which provides paths for each package.

### Lint / Format

Eslint and prettier are used in identical fashion as before.

### Testing

Jest is used as before, with a slightly more complex initial setup needed to properly reference other workspace packages, though more work could be done here to simplify this.

### Workspaces / [pnpm](https://pnpm.io/workspaces)

The repo uses pnpm as its package manager, as a replacement for npm. Pnpm offers a substantial number of benefits compared to npm, especially in regards to its support for monorepos and 'workspaces'. It has built in support for managing package dependencies within a workspace, as well as publishing those packages properly.

### Versioning / [changesets](https://github.com/changesets/changesets)

This repo introduces the changesets tool to manage versioning and changelog management programmatically. It provides easy CLI functionality to manage what packages need to be version bumped, the semver type of that bump, and will automatically create changelogs that are published in each package. There are also an extensive amount of Github actions integrations that can be leveraged in the future to automate many of these processes.
