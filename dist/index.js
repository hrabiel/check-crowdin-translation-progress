require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 826:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 468:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(826);
const axios = (__nccwpck_require__(468)["default"]);

run();

async function run() {
  try {
    const apiToken = core.getInput('api-token', { required: true });
    const projectId = core.getInput('project-id', { required: true });
    const organizationDomain = core.getInput('organization-domain');
    const languages = core.getInput('languages').split(',');
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

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map