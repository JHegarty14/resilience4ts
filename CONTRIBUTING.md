# Contributing to Resilience4ts

Resilience4ts is open to any and all contributions! As a contributor, here are the guidelines we would like you to follow:

- [Issues and Bugs](#issue)
- [Feature Requests](#feature)
- [Submission Guidelines](#submit)
- [Development Setup](#development)
- [Running Tests](#running-tests)
- [Coding Rules](#rules)
- [Commit Message Guidelines](#commit)

## <a name="issue"></a> Found a Bug?

If you find a bug in the source code, you can help us by
[submitting an issue](#submit-issue) to our [GitHub Repository][github]. Even better, you can
[submit a Pull Request](#submit-pr) with a fix.

## <a name="feature"></a> Missing a Feature?

You can _request_ a new feature by [submitting an issue](#submit-issue) to our GitHub
Repository. If you would like to _implement_ a new feature, please submit an issue with
a proposal for your work first, to be sure that we can use it.
Please consider what kind of change it is:

- For a **Major Feature**, first open an issue and outline your proposal so that it can be
  discussed. This will also allow us to better coordinate our efforts, prevent duplication of work,
  and help you to craft the change so that it is successfully accepted into the project. For your issue name, please prefix your proposal with `[discussion]`, for example "[discussion]: your feature idea".
- **Small Features** can be crafted and directly [submitted as a Pull Request](#submit-pr).

## <a name="submit"></a> Submission Guidelines

### <a name="submit-issue"></a> Submitting an Issue

Before you submit an issue, please search the issue tracker, maybe an issue for your problem already exists and the discussion might inform you of workarounds readily available.

We want to fix all the issues as soon as possible, but before fixing a bug we need to reproduce and confirm it. In order to reproduce bugs we will systematically ask you to provide a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/). Having a live, reproducible scenario gives us wealth of important information without going back & forth to you with additional questions like:

- version of Resilience4ts used
- 3rd-party libraries and their versions
- and most importantly - a use-case that fails

Unfortunately, we are not able to investigate / fix bugs without a minimal reproduction, so if we don't hear back from you we are going to close an issue that doesn't have enough info to be reproduced.

You can file new issues by filling out our [new issue form][new_issue].

### <a name="submit-pr"></a> Submitting a Pull Request (PR)

Before you submit your Pull Request (PR) consider the following guidelines:

1. Search [GitHub Pull Requests][gh_prs] for an open or closed PR
   that relates to your submission. You don't want to duplicate effort.
1. Fork this repository.
1. Make your changes in a new git branch:

   ```shell
   git checkout -b my-fix-branch main
   ```

1. Create your patch, **including appropriate test cases**.
1. Follow our [Coding Rules](#rules).
1. Run the full Resilience4ts test suite (see [common scripts](#common-scripts)),
   and ensure that all tests pass.
1. Commit your changes using a descriptive commit message that follows our
   [commit message conventions](#commit). Adherence to these conventions
   is necessary because release notes are automatically generated from these messages.

   ```shell
   git commit -a
   ```

   Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files.

1. Push your branch to GitHub:

   ```shell
   git push origin my-fix-branch
   ```

1. In GitHub, send a pull request to `resilience4ts:main`.

- If we suggest changes then:

  - Make the required updates.
  - Re-run the Resilience4ts test suites to ensure tests are still passing.
  - Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

    ```shell
    git rebase main -i
    git push -f
    ```

That's it! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, your branch will be automatically deleted and you can pull the changes
from the main (upstream) repository:

- If you restore your branch for any reason, you can delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows once you're done:

  ```shell
  git push origin --delete my-fix-branch
  ```

- Check out the main branch:

  ```shell
  git checkout main -f
  ```

- Delete the local branch:

  ```shell
  git branch -D my-fix-branch
  ```

- Update your main with the latest upstream version:

  ```shell
  git pull --ff upstream main
  ```

## <a name="development"></a> Development Setup

You will need [Node.js](https://nodejs.org) version >= 16.20.1.

1. After cloning the repo, run:

```bash
$ npm ci --legacy-peer-deps # (or yarn install)
```

2. In order to prepare your environment run `prepare.sh` shell script:

```bash
$ sh scripts/prepare.sh
```

That will compile fresh packages and afterward, move them all to `sample` directories.

### <a name="common-scripts"></a>Commonly used NPM scripts

```bash
# build all packages and move to "sample" directories
$ npm run build

# run the full unit tests suite (see [Running Tests](#running-tests))
$ npm run test

# run the full unit tests suite with coverage
$ npm run test:ci

# run linter (eslint)
$ npm run lint

# run linter with auto-fix
$ npm run lint:fix

# format all files with prettier
$ npm run format

# run typechecker
$ npm run typecheck
```

## <a name="running-tests"></a> Running Tests

Tests are run against a containerized Redis instance. Ensure you have Docker installed and running and a Redis instance is available on `localhost:6379`, then run:

```bash
$ npm run test
```

## <a name="rules"></a> Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

- All features or bug fixes **must be tested** by one or more specs (unit-tests).
- We follow [Google's JavaScript Style Guide][js-style-guide], but wrap all code at
  **100 characters**. An automated formatter is available (`npm run format`).

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more
readable messages** that are easy to follow when looking through the **project history**. But also,
we use the git commit messages to **generate the Resilience4ts change log**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer than 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

Footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

Samples: (even more [samples][commits_samples])

```
docs(changelog): update change log to beta.5
fix(core): need to depend on latest rxjs and zone.js
```

### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **chore**: Updating tasks etc; no production code change
- **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests
- **sample**: A change to the samples

### Scope

The scope should have the name of the npm package affected (as perceived by person reading changelog generated from commit messages).

The following is the list of supported scopes:

- **all**: for changes made on `packages/all` directory
- **bulkhead**: for changes made on `packages/bulkhead` directory
- **cache**: for changes made on `packages/cache` directory
- **circuit-breaker**: for changes made on `packages/circuit-breaker` directory
- **concurrent-lock**: for changes made on `packages/concurrent-lock` directory
- **concurrent-queue**: for changes made on `packages/concurrent-queue` directory
- **core**: for changes made on `packages/core` directory
- **fallback**: for changes made on `packages/fallback` directory
- **hedge**: for changes made on `packages/hedge` directory
- **nestjs**: for changes made on `packages/nestjs` directory
- **rate-limiter**: for changes made on `packages/rate-limiter` directory
- **retry**: for changes made on `packages/retry` directory
- **timeout**: for changes made on `packages/timeout` directory

If your change affect more than one package, separate the scopes with a comma (e.g. `all,core`).

There are currently a few exceptions to the "use package name" rule:

- **packaging**: used for changes that change the npm package layout in all of our packages, e.g. public path changes, package.json changes done to all packages, d.ts file/format changes, changes to bundles, etc.
- **changelog**: used for updating the release notes in CHANGELOG.md
- **sample/#**: for the example apps directory, replacing # with the example app number
- none/empty string: useful for `style`, `test` and `refactor` changes that are done across all packages (e.g. `style: add missing semicolons`)

### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

A detailed explanation can be found in this [document][commit-message-format].

[commit-message-format]: https://github.com/jhegarty14/resilience4ts/blob/main/.github/PULL_REQUEST_TEMPLATE.md
[github]: https://github.com/jhegarty14/resilience4ts
[js-style-guide]: https://google.github.io/styleguide/jsguide.html
[new_issue]: https://github.com/jhegarty14/resilience4ts/issues/new
[gh_prs]: https://github.com/jhegarty14/resilience4ts/pulls
[commits_samples]: https://github.com/jhegarty14/resilience4ts/commits/main
