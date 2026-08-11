# How to Contribute

## Find an Issue?
If you found an issue/bug, feel free to add it to the GitHub Issues! There is a bug report template to fill out. Make sure to check to see if the issue already exists before writing your own.


## Contributing Code
If you write code for the project, you are welcome to add it to the repository! However, please ensure you have done the following:

1. PR: make a GitHub pull request of your desired changes.
2. Run the CI: GitHub should automatically run the CI against new commits in PRs. Make sure all tests pass and coverge doesn't drop signficantly.
3. Write Tests: For any new feature added, be sure to write tests against it. Untested code should not be merged.


## Conventions
Some basic conventions we have adopted:
- Follow the TypeScript style guide: `camelCase` for variables, ensure proper typing, etc.
- Business logic files should be named `kebab-case`. Export using ES6 standards.
- Svelte components should be named `PascalCase`. Use proper HTML and CSS tags/attributes/conventions.
- New code files go in `/src/lib`. Test files go in `/src/test` and should be named the same as the source file being tested.


Thank you for helping with the AFTAC-HYSPLIT KMZ Visualizer. We are grateful for the support!
