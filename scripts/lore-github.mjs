import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { loadArchive, loadPerspectiveAccounts, parseEventFile, site } from './lore-form.mjs';
import { bodySha, validateSubmission, prepareFiles } from './lore-submission.mjs';

const marker = '<!-- known-galaxy-lore-feedback -->';
const statusLabels = {
  'lore:needs-information': ['d876e3', 'Submission needs corrections or additional information'],
  'lore:in-review': ['fbca04', 'Technical checks passed; awaiting editorial review'],
  'lore:ready-to-publish': ['0e8a16', 'An editor requested a draft; review and merge are still required'],
  'lore:published': ['1d76db', 'Approved event is included in a successful Pages deployment'],
};
const safeText = (s) => s.replace(/[<>&@]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '@': '&#64;' }[c]));
const repoArgs = (context) => ({ owner: context.repo.owner, repo: context.repo.repo });
const initializedLabels = new WeakSet();

export async function setStatus(github, context, number, status) {
  const repo = repoArgs(context);
  if (!initializedLabels.has(github)) for (const [name, [color, description]] of Object.entries(statusLabels)) {
    try { await github.rest.issues.getLabel({ ...repo, name }); }
    catch (e) { if (e.status !== 404) throw e; try { await github.rest.issues.createLabel({ ...repo, name, color, description }); } catch (race) { if (race.status !== 422) throw race; } }
  }
  initializedLabels.add(github);
  const issue = (await github.rest.issues.get({ ...repo, issue_number: number })).data;
  for (const label of issue.labels) if (statusLabels[label.name] && label.name !== status) await github.rest.issues.removeLabel({ ...repo, issue_number: number, name: label.name });
  await github.rest.issues.addLabels({ ...repo, issue_number: number, labels: [status] });
}

export async function report(github, context, number, text) {
  const repo = repoArgs(context);
  const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: number, per_page: 100 });
  const previous = comments.find((c) => c.user?.login === 'github-actions[bot]' && c.body?.startsWith(marker));
  const body = `${marker}\n${text}`;
  if (previous) await github.rest.issues.updateComment({ ...repo, comment_id: previous.id, body });
  else await github.rest.issues.createComment({ ...repo, issue_number: number, body });
}

export function feedback(result) {
  if (!result.valid) return `**Submission needs information**\n\n${result.errors.map((s) => `- ${safeText(s)}`).join('\n')}\n\nEdit the issue body to correct these fields. If this issue used the older form, copy your work into a new issue using the current template. Checks run again when the body changes.`;
  return `**Technical submission checks passed — awaiting editorial review**\n\nThe event date, metadata choices, related references, and required information are valid. This does not establish canon or verify image permission.${result.dateSummary ? `\n\n**Calendar conversion:** ${safeText(result.dateSummary)}` : ''}${result.warnings.length ? `\n\n${result.warnings.map((s) => `- ${safeText(s)}`).join('\n')}` : ''}\n\nAn editor with repository write access should verify the sources, new names, article, and image permission, then comment \`/prepare-lore\` to prepare a draft pull request. Main images are decoded and checked during preparation. No content is published automatically.`;
}

export async function editorAllowed(github, context, actor) {
  try {
    const response = await github.rest.repos.getCollaboratorPermissionLevel({ ...repoArgs(context), username: actor });
    return ['write', 'maintain', 'admin'].includes(response.data.permission);
  } catch (e) { if (e.status === 404) return false; throw e; }
}

export async function stage({ github, context, core, root = '.', download }) {
  core.setOutput('prepared', 'false');
  const dispatch = context.eventName === 'workflow_dispatch';
  const command = context.eventName === 'issue_comment' && context.payload.comment?.body?.trim() === '/prepare-lore';
  if (context.eventName === 'issue_comment' && !command) return;
  const rawNumber = dispatch ? context.payload.inputs?.issue_number : context.payload.issue?.number;
  if (!/^\d+$/.test(String(rawNumber)) || !Number.isSafeInteger(Number(rawNumber)) || Number(rawNumber) < 1) throw new Error('Choose a positive issue number.');
  const number = Number(rawNumber), repo = repoArgs(context);
  const issue = (await github.rest.issues.get({ ...repo, issue_number: number })).data;
  if (issue.pull_request || issue.state !== 'open') return;
  if (!issue.title.startsWith('[Lore]') && !issue.body?.includes('### Request type')) return;
  if ((dispatch || command) && !await editorAllowed(github, context, dispatch ? context.actor : context.payload.comment.user.login)) {
    core.notice('Draft preparation ignored: the requester does not have repository write access.'); return;
  }
  const records = await loadArchive(root), result = validateSubmission(issue, records, await loadPerspectiveAccounts(root));
  await setStatus(github, context, number, result.valid ? 'lore:in-review' : 'lore:needs-information');
  await report(github, context, number, feedback(result));
  if (!result.valid || (!dispatch && !command)) return;
  const branch = `codex/lore-issue-${number}`;
  const prs = await github.paginate(github.rest.pulls.list, { ...repo, state: 'all', head: `${context.repo.owner}:${branch}`, per_page: 100 });
  const previous = prs.find((p) => p.state === 'open');
  if (!previous && prs.length) throw new Error('This submission already has a closed pull request. Reopen that draft, or use a new correction issue for a published event.');
  let previousSha;
  try { previousSha = (await github.rest.git.getRef({ ...repo, ref: `heads/${branch}` })).data.object.sha; } catch (e) { if (e.status !== 404) throw e; }
  if (previous) {
    const generatedSha = previous.body?.match(/<!-- lore-generated-sha:([a-f0-9]{40}) -->/)?.[1];
    if (!previous.draft || previous.head.sha !== generatedSha || previousSha !== generatedSha) throw new Error('The existing draft was edited manually or is ready for review. Automation will not overwrite it. Finish that review or make a new correction issue.');
    if (previous.body.includes(`<!-- lore-body-sha:${result.bodyHash} -->`)) {
      await setStatus(github, context, number, 'lore:ready-to-publish');
      await report(github, context, number, `**Draft already prepared**\n\n[Review pull request #${previous.number}](${previous.html_url}). No duplicate was created. Download the lore-review-previews artifact from the linked preparation run to inspect the browser-ready HTML files.`); return;
    }
  } else if (previousSha) {
    const orphan = (await github.rest.git.getCommit({ ...repo, commit_sha: previousSha })).data;
    if (!orphan.message.startsWith(`Automated lore submission #${number}\n`)) throw new Error('The draft branch already exists and was not generated for this issue. Choose a new issue or resolve the branch manually.');
  }
  const defaultBranch = context.payload.repository.default_branch;
  const baseSha = (await github.rest.git.getRef({ ...repo, ref: `heads/${defaultBranch}` })).data.object.sha;
  if (context.sha !== baseSha) throw new Error('The default branch changed while preparation started. Run /prepare-lore again.');
  const base = (await github.rest.git.getCommit({ ...repo, commit_sha: baseSha })).data;
  const files = await prepareFiles(result, records, root, download);
  const pending = { number, branch, baseSha, baseTree: base.tree.sha, previousSha, previousPr: previous?.number, bodyHash: result.bodyHash, slug: result.data.slug, title: result.data.title, files: files.map((f) => ({ ...f, content: f.binary ? f.content.toString('base64') : f.content })) };
  await mkdir(`${root}/.lore-workflow`, { recursive: true });
  await writeFile(`${root}/.lore-workflow/prepared.json`, JSON.stringify(pending));
  core.setOutput('prepared', 'true');
  core.setOutput('issue_number', String(number));
  core.setOutput('slug', result.data.slug);
  await core.summary.addRaw(`Prepared issue #${number}. Checks, build, and image decoding must finish before the draft is created.\n`).write();
}

export async function publishDraft({ github, context, core, root = '.' }) {
  const pending = JSON.parse(await readFile(`${root}/.lore-workflow/prepared.json`, 'utf8')), repo = repoArgs(context);
  const issue = (await github.rest.issues.get({ ...repo, issue_number: pending.number })).data;
  if (issue.state !== 'open' || bodySha(issue.body) !== pending.bodyHash) throw new Error('The issue changed during preparation. Review the new text and run /prepare-lore again.');
  const currentMain = (await github.rest.git.getRef({ ...repo, ref: `heads/${context.payload.repository.default_branch}` })).data.object.sha;
  if (currentMain !== pending.baseSha) throw new Error('The archive changed during preparation. Run /prepare-lore again against the current archive.');
  let currentBranch;
  try { currentBranch = (await github.rest.git.getRef({ ...repo, ref: `heads/${pending.branch}` })).data.object.sha; } catch (e) { if (e.status !== 404) throw e; }
  if (currentBranch !== pending.previousSha) throw new Error('The draft branch changed during preparation; automation will not overwrite it.');
  const tree = [];
  for (const file of pending.files) {
    const blob = (await github.rest.git.createBlob({ ...repo, content: file.content, encoding: file.binary ? 'base64' : 'utf-8' })).data;
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = (await github.rest.git.createTree({ ...repo, base_tree: pending.baseTree, tree })).data;
  const commit = (await github.rest.git.createCommit({ ...repo, tree: newTree.sha, parents: [...new Set([pending.previousSha, pending.baseSha].filter(Boolean))], message: `Automated lore submission #${pending.number}\n\nBody SHA: ${pending.bodyHash}` })).data;
  if (pending.previousSha) await github.rest.git.updateRef({ ...repo, ref: `heads/${pending.branch}`, sha: commit.sha, force: false });
  else await github.rest.git.createRef({ ...repo, ref: `refs/heads/${pending.branch}`, sha: commit.sha });
  const runUrl = `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`;
  const body = `<!-- lore-issue:${pending.number} -->\n<!-- lore-body-sha:${pending.bodyHash} -->\n<!-- lore-generated-sha:${commit.sha} -->\nPrepared from issue #${pending.number} after an editor requested generation.\n\nReview the article, sources and new names in the issue, the metadata, imagery, and chronology before merging. This automation neither approves nor merges the change.\n\nValidation: shared submission schema, archive type checks, workflow tests, and production build passed. [Preparation run and browser-ready previews](${runUrl}): download **lore-review-previews**, extract it, and open the event HTML file in your browser. No server is required.\n\nMark the draft ready for review once the content is accepted. If GitHub displays **Approve workflows to run**, approve the PR checks and wait for them to pass.\n\nCloses #${pending.number}`;
  let pr;
  try {
    pr = pending.previousPr ? (await github.rest.pulls.update({ ...repo, pull_number: pending.previousPr, title: `Lore: ${pending.title}`, body })).data : (await github.rest.pulls.create({ ...repo, head: pending.branch, base: context.payload.repository.default_branch, title: `Lore: ${pending.title}`, body, draft: true })).data;
  } catch (e) { throw new Error(`Draft branch created, but GitHub could not create/update the pull request (HTTP ${e.status ?? 'unknown'}). Enable Settings → Actions → General → Allow GitHub Actions to create and approve pull requests, then retry /prepare-lore.`); }
  await setStatus(github, context, pending.number, 'lore:ready-to-publish');
  await report(github, context, pending.number, `**Draft ready for editorial review**\n\n[Review pull request #${pr.number}](${pr.html_url}). [Download browser-ready previews from this run](${runUrl}) under Artifacts → lore-review-previews. Extract the download and open \`${pending.slug}/index.html\` in a browser.\n\nAn editor still needs to approve the content, mark the draft ready, and merge after checks pass. The Published label is applied only after a successful Pages deployment containing this submission.`);
  await core.summary.addRaw(`[Draft pull request #${pr.number}](${pr.html_url})\n\nDownload the lore-review-previews artifact and open ${pending.slug}/index.html.\n`).write();
}

export async function preparationFailed({ github, context, root = '.' }) {
  let pending;
  try { pending = JSON.parse(await readFile(`${root}/.lore-workflow/prepared.json`, 'utf8')); } catch { /* A preflight error can occur before staging. */ }
  const number = pending?.number ?? context.payload.issue?.number ?? Number(context.payload.inputs?.issue_number);
  if (!Number.isSafeInteger(number) || number < 1 || context.payload.issue?.pull_request) return;
  const runUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
  await setStatus(github, context, number, 'lore:needs-information');
  await report(github, context, number, `**Preparation could not finish**\n\n[Open the failed workflow step](${runUrl}) for the exact reason. No draft was merged or published. Correct the issue, image, or repository setting described there, then have an editor run \`/prepare-lore\` again.`);
}

export async function trackPublication({ github, context }) {
  const run = context.payload.workflow_run, repo = repoArgs(context);
  if (run?.conclusion !== 'success' || run.head_branch !== context.payload.repository.default_branch || run.repository?.full_name !== `${repo.owner}/${repo.repo}`) return;
  const tree = (await github.rest.git.getTree({ ...repo, tree_sha: run.head_sha, recursive: '1' })).data;
  if (tree.truncated) throw new Error('Deployment tree is truncated; publication tracking needs pagination.');
  for (const file of tree.tree.filter((f) => f.type === 'blob' && f.path.startsWith('src/content/events/') && f.path.endsWith('.md'))) {
    const blob = (await github.rest.git.getBlob({ ...repo, file_sha: file.sha })).data;
    const event = parseEventFile(Buffer.from(blob.content, 'base64').toString('utf8'), file.path).data;
    if (event.draft || event.demo || !event.submissionIssue) continue;
    const issue = (await github.rest.issues.get({ ...repo, issue_number: event.submissionIssue })).data;
    if (issue.labels.some((l) => l.name === 'lore:published')) continue;
    if (event.submissionBodySha !== bodySha(issue.body)) {
      await setStatus(github, context, event.submissionIssue, 'lore:in-review');
      await report(github, context, event.submissionIssue, `An earlier version of this submission is [published](${site}#${event.slug}), but the issue body has changed since preparation. Those edits are not published. Use a new correction issue to request the additional changes.`); continue;
    }
    await setStatus(github, context, event.submissionIssue, 'lore:published');
    await report(github, context, event.submissionIssue, `**Published**\n\n[View the event](${site}#${event.slug}). [GitHub Pages deployment](${run.html_url}) completed successfully. Further changes need a new reviewed correction submission.`);
  }
}
