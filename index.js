const core = require('@actions/core');
const axios = require('axios').default;

run();

async function run() {
  try {
    const apiToken = core.getInput('api-token', { required: true });
    const projectId = core.getInput('project-id', { required: true });
    const organizationDomain = core.getInput('organization-domain');
    const languages = core.getInput('languages') ? core.getInput('languages').split(',') : [];
    const branchName = core.getInput('branch-name');
    const targetProgress = Number(core.getInput('target-progress'));
    const checkApproval = core.getBooleanInput('check-approval');

    setupAxios({ apiToken, organizationDomain });

    const progresses = await (
      branchName
        ? getBranchProgress({ projectId, branchName })
        : getProjectProgress({ projectId })
    );
    const projectLanguages = progresses.map(item => item.languageId);
    const languagesToCheck = languages.length ? languages : projectLanguages;

    core.info(`Checking progress for languages: ${languagesToCheck.join(',')}...`);
    const errors = [];
    languagesToCheck.forEach(language => {
      if (!projectLanguages.includes(language)) {
        errors.push(
          `Language '${language}' does not exist in the project. ` +
          `Project's languages are: ${projectLanguages.join(',')}.`
        );
        return;
      }

      const progress = progresses.find(item => item.languageId === language);
      const progressPercentage = checkApproval ? progress.approvalProgress : progress.translationProgress;
      if (progressPercentage < targetProgress) {
        const totalPhrases = progress.phrases.total;
        const donePhrases = checkApproval ? progress.phrases.approved : progress.phrases.translated;
        const totalWords = progress.words.total;
        const doneWords = checkApproval ? progress.words.approved : progress.words.translated;

        errors.push(
          `${checkApproval ? 'Proofreading' : 'Translation'} not completed for "${language}": ` +
          `${progressPercentage}% done` +
          `(${donePhrases} of ${totalPhrases} strings, ${doneWords} of ${totalWords} words), ` +
          `target percentage is ${targetProgress}%.`
        );
        return;
      }

      core.info(
        `${checkApproval ? 'Proofreading' : 'Translation'} completed for "${language}": ` +
        `${progressPercentage}% done (target percentage is ${targetProgress}%).`
      );
    });

    if (errors.length) {
      core.setFailed(errors.join(' '));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function setupAxios({ apiToken, organizationDomain }) {
  const apiBaseUrl = organizationDomain
    ? `https://${organizationDomain}.api.crowdin.com/api/v2/`
    : 'https://api.crowdin.com/api/v2/';

  axios.defaults.baseURL = apiBaseUrl;
  axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
  axios.interceptors.response.use(
    response => response,
    error => {
      const errorMessageInBody = error.response.data.error?.message;
      if (errorMessageInBody) {
        throw new Error(`${error.message}: ${errorMessageInBody}`);
      }

      throw error;
    }
  );
}

async function getBranchProgress({ projectId, branchName }) {
  core.info(`Getting branch by name '${branchName}'...`);
  const listBranchesResponse = await axios.get(`/projects/${projectId}/branches?name=${branchName}`);
  const branchId = listBranchesResponse.data.data[0]?.data?.id;
  if (!branchId) {
    throw new Error(`No branch found with name '${branchName}'`);
  }
  core.info('Done!');

  core.info(`Getting progress for the branch (id=${branchId})...`);
  const progressResponse = await axios.get(`/projects/${projectId}/branches/${branchId}/languages/progress?limit=500`);
  core.info('Done!');

  return getProgressFromResponse(progressResponse);
}

async function getProjectProgress({ projectId }) {
  core.info('Getting progress for the project...');
  const progressResponse = await axios.get(`/projects/${projectId}/languages/progress?limit=500`);
  core.info('Done!');

  return getProgressFromResponse(progressResponse);
}

function getProgressFromResponse(response) {
  return response.data.data.map(item => item.data);
}
