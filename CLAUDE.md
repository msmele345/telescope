# Project Name
Telecope

# Project Details:
See @plans/telescope-star-map.md

# Run Commands:
- npm run dev 
- npm test 
- npm run build 

# Git Strategy and Instructions
- Create feature branches off of develop for each new feature or task. Name branches using the format `feature/short-description` (e.g., `feature/spotify-integration`).
- Git Strategy is Git Flow with the following branches:
  - `main` - production ready code
  - `develop` - latest development code, merged from feature branches
  - `feature/*` - individual feature branches created from develop, merged back into develop when complete
  - `release/*` - created from develop when preparing for a release, merged into main
- PRs should be used to merge feature branches into develop, and release branches into main. PRs should be reviewed and approved by me before merging.
- Use Squash and Merge for all PRs to keep a clean commit history.
- Commit messages should follow best practices and use the format: (feat:, chore:, fix:, docs:, refactor:) Examples: 
  - `feat: add new widget for genre breakdown`
  - `chore: minor tasks like updating dependencies or fixing typos`
  - `fix: resolve bug in Spotify API integration` 
  - `docs: update README with setup instructions`
  - `refactor: service layer redesign`