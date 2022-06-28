const core = require('@actions/core');
const axios = require('axios').default;

run();

async function run() {
  try {
    const apiToken = core.getInput('api-token');
    const projectId = core.getInput('project-id');
    const organizationDomain = core.getInput('organization-domain');
    const languages = core.getInput('languages').split(',');
    const branchName = core.getInput('branch-name');
    const targetProgress = Number(core.getInput('target-progress'));
    const checkApproval = core.getInput('check-approval') === 'true' ? true : false;

    setupAxios({ apiToken, organizationDomain });

    const progresses = await (
      branchName
        ? getBranchProgress({ projectId, branchName })
        : getProjectProgress({ projectId })
    );
    const projectLanguages = progresses.map(item => item.languageId);
    const languagesToCheck = languages.length ? languages : projectLanguages;

    const errors = [];
    languagesToCheck.forEach(language => {
      if (!projectLanguages.includes(language)) {
        errors.push(
          `Language '${language}' does not exist in the project. ` +
          `Project's languages are: ${projectLanguages.join(',')}.`
        );
        return;
      }

      const progress = progresses.find(item => item.languageId == language);
      const progressPercentage = checkApproval ? progress.approvalProgress : progress.translationProgress;
      if (progressPercentage < targetProgress) {
        errors.push(
          `${checkApproval ? 'Approval' : 'Translation'} progress for '${language}' (${progressPercentage}%) ` +
          `is less then target progress (${targetProgress}%)`
        )
      }
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

  axios.defaults.baseUrl = apiBaseUrl;
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
  const listBranchesResponse = await axios.get(`/projects/${projectId}/branches?name=${branchName}`);
  const branchId = listBranchesResponse.data.data[0]?.data?.id;
  if (!branchId) {
    throw new Error(`No branch found with name '${branchName}'`);
  }

  const progressResponse = await axios.get(`/projects/${projectId}/branches/${branchId}/languages/progress?limit=500`);
  return getProgressFromResponse(progressResponse);
}

async function getProjectProgress({ projectId }) {
  const progressResponse = await axios.get(`/projects/${projectId}/languages/progress?limit=500`);
  return getProgressFromResponse(progressResponse)
}

function getProgressFromResponse(response) {
  return response.data.data.map(item => item.data);
}
