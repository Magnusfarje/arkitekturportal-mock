import { checkDirectory } from './check';
import { contentDir } from './__testUtils__/content';

// The check of a content repository: the content under ARCHITECTURE_CONTENT_DIR
// (or the test copy) follows the artifact definition. The content repository's
// CI runs this test against itself; the problems, one line each, are what fails.
it('follows the artifact definition', async () => {
  const { artifacts, problems } = await checkDirectory(contentDir);
  expect(problems).toEqual([]);
  expect(artifacts).toBeGreaterThan(0);
});
