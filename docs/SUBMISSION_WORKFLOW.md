# Submission and publication workflow

Contributors fill out the lore issue form. Automation checks the submission; an editor approves the facts and requests generation; reviewers inspect a draft and preview; a human merges; GitHub Pages deploys. No bot approves or merges lore.

## One-time setup

1. Merge the workflow pull request into `main`. Issue-triggered workflows must exist on the default branch before submissions can use them. Existing issues do not receive a retroactive run; edit the body or use the manual run described below.
2. Open **Settings → Actions → General → Workflow permissions**. Enable **Allow GitHub Actions to create and approve pull requests**, then save. The workflow uses the temporary `GITHUB_TOKEN`; no personal token or paid service is required. Although GitHub's setting mentions approval, this workflow never approves a pull request.
3. Keep Pages' publishing source as **GitHub Actions**. The existing deployment remains the publication mechanism.
4. Submit a genuine lore proposal using the new form. Older issues used different headings and must be copied into a new issue with the current fields before automation can prepare them.

The jobs request their own scoped permissions in YAML. You do not need to change the repository's global token default to unrestricted read/write. Organization policy can prevent the PR-creation setting from being enabled; an administrator would need to resolve that policy, or a maintainer can prepare files manually.

GitHub documentation: [repository workflow settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [workflow trigger and token behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## Contributor steps

1. Open the form from **Issues → New issue → Submit or update a lore event**, or the website footer.
2. Read the recorded names, existing records, and field guidance at the top. These are generated from the current archive. Locations and characters are not closed enums: new names need supporting community lore and editorial acceptance. Eras, faction categories, types, calendars, and importance are fixed choices. Related references must identify an existing published event by exact slug or event link.
3. Complete the whole proposed article and metadata. For corrections, choose **Update an existing event** and supply its link. Leave irrelevant optional lists blank. Upload the selected main image in its dedicated field; supporting files stay in the issue.
4. Create the issue. Wait for the workflow's feedback comment. If fields are invalid, edit the issue body to correct them; checks run again. GitHub converts the form to a Markdown issue body, so edits do not reopen the original dropdown form. Keep every `### Field label` heading, even for empty optional fields. Empty optional values can be `_No response_`.

## Editor steps

1. Read the article, sources, image permission, and warnings about new names. Technical checks do not establish canon. Resolve uncertainty with the contributor.
2. Once the proposal is editorially approved, post **`/prepare-lore`** as a comment containing only that command. The workflow verifies the comment author's current repository permission: `write`, `maintain`, or `admin` is required. Read/triage access cannot generate drafts. Alternatively use **Actions → Check and prepare lore submissions → Run workflow**, choose `main`, and enter the open issue number.
3. Preparation imports and decodes the one selected GitHub-hosted main image, optimizes it to WebP, writes metadata and article files, regenerates the form/reference, runs checks/tests, and builds previews. The main image needs source/permission evidence and alt text. Still PNG, JPEG, and WebP files are supported, up to 10 MiB and 40 million pixels; SVG, GIF, documents, videos, and outside hosts remain supporting evidence only. Kept image paths and slugs survive corrections. Replacing/removing imagery does not delete the old asset automatically.
4. Follow the feedback comment to the draft pull request and preparation run. Under **Artifacts**, download **lore-review-previews**, extract the ZIP, and open `EVENT-SLUG/index.html` in your browser. The previews embed their CSS and selected main imagery; no server is required. They show the card, article, date, classifications, lists, image alt text, related slugs, and same-year order. Inline article images are flagged for separate inspection in the diff. Preview files expire after 30 days; the ordinary PR validation run also creates this artifact.
5. Inspect the diff and preview. Check facts, spelling, related records, chronology, image cropping, and alt text. Mark the draft **Ready for review** when accepted. If GitHub displays **Approve workflows to run**, approve the PR checks; GitHub may require that for PRs opened by `GITHUB_TOKEN`. Wait for **Validate archive** to pass, then merge manually.
6. Watch **Deploy to GitHub Pages**. The issue closes through `Closes #NUMBER` when the PR merges. **Track published lore** applies the Published label and live event link only after a successful deployment whose exact Git revision contains this submission. A merged issue can be closed while deployment is still pending or failed.

## Progress labels

| Label | Meaning |
| --- | --- |
| `lore:needs-information` | Invalid/missing form fields, or preparation could not finish; read the bot feedback and failed step |
| `lore:in-review` | Technical checks passed; an editor must review the facts and sources |
| `lore:ready-to-publish` | Draft requested and generated; content review, PR checks, merge, and deployment still remain |
| `lore:published` | A successful Pages deployment contains the exact prepared submission version |

The workflow creates these labels if missing and updates one bot feedback comment to keep the issue readable. Other labels and assignees are preserved. Issue body edits reset review status; they never silently change a draft or the website.

## Corrections, retries, and unsuccessful runs

- Repeating `/prepare-lore` for an unchanged issue links to the existing draft without making a duplicate. An edited issue can regenerate its still-unmodified draft after fresh editorial review. Generated branches use `codex/lore-issue-NUMBER`.
- The workflow refuses to overwrite a draft changed manually or already marked ready. Finish that review, or submit a new correction after publication. An issue with a closed PR needs that PR reopened, or a new correction issue; it does not create repeated replacement PRs.
- If the issue, default branch, or draft branch changes during preparation, generation stops. Review the latest state and request preparation again. This prevents stale article text or another editor's work from being overwritten.
- If GitHub refuses PR creation, enable the setting from One-time setup and retry. The workflow can recover its own orphaned generated branch.
- If publication fails, the issue does not receive Published. Fix the named deployment error and rerun Pages. Follow-up changes to closed issues need new reviewed corrections; issue edits are never automatic website edits.
- For manual event/configuration edits, run `npm run lore:sync` and commit the generated form and reference. CI runs `npm run lore:check` to catch stale lists, duplicate slugs, invalid relationships, and invalid metadata. The generator uses the same schema as Astro, and names come only from published non-demo metadata.

## Maintenance and trust boundaries

The workflow runs trusted repository code from the default branch. It treats issue text as data, serializes metadata with YAML, validates generated paths, restricts image downloads to GitHub attachment storage, and sanitizes rendered public Markdown. It never checks out a submitter's code or puts issue fields inside shell commands. Automatic checks give feedback only; draft generation requires a currently authorized editor; merging remains a human action.

The submission body digest and issue number are stored in `submissionBodySha` and `submissionIssue` for provenance and deployment tracking. Sources/approval discussion and supporting files stay in the public issue unless the editor intentionally includes reader-facing source links in the article. Live tracking reads the revision that actually deployed, rather than assuming the newest checkout has been published.
