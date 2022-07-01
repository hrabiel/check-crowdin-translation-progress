# Check Crowdin Translation Progress

Check translation and approval progress for your project in [Crowdin](https://crowdin.com/) localization management platform.

Raises error with descriptive message if actual progress is lower than target progress you set.
Can be run against specific branch in Crowdin or for the whole project.
Either translation progress or approval (proofread) progress can be checked.

Can be used as a part of CI/CD pipelines to ensure that:
- all features are completely translated before they are merged to main branch,
- the project is released 100% localized.

More info about versions management in Crowdin: https://support.crowdin.com/versions-management/

# Usage

```yaml
  - uses: hrabiel/check-crowdin-translation-progress
  - with:
        # Crowdin personal access token.
        #
        # Required: true
      api-token: "CrowdinPersonalAccessToken"

        # Domain of your organization (for Crowdin Enterprise only).
        # Skip if your account is non-enterprise.
        #
        # Required: false
      organization-domain: 'myorg'

        # ID of your project in Crowdin.
        #
        # Required: true
      project-id: "12345"

        # Crowdin branch name, for example `"feature.my-awesome-feature"`.
        # Should be provided if you use branches in Crowdin and you want to check progress for
        # specific branch only.
        # Skip if you want to check progress for the whole project.
        #
        # Required: false
      branch-name: "feature.my-awesome-feature"

        # List of codes for languages that should be checked, separated by comma,
        # for example `"be,fr,lt"`.
        # You can skip this input if you want to check all target languages of your project.
        #
        # Required: false
      languages: "be,fr,lt"

        # Percentage of progress that is sufficient for you.
        # Example: `"95"`.
        # If actual progress is less than this, the check will fail.
        # Skip if your desired progress is 100%.
        #
        # Required: false
        # Default: "100"
      target-progress: "50"

        # If `true`, the check will be run against approval (proofread) progress instead of
        # translation progress.
        #
        # Required: false
        # Default: "true"
      check-approval: true
```

# Scenarios

## Crowdin project should be completely translated and approved

```yaml
  - uses: hrabiel/check-crowdin-translation-progress
  - with:
      api-token: "CrowdinPersonalAccessToken"
      project-id: "12345"
```

## Specific branch in Crowdin Enterprise project should be translated 90% to Belarusian, French and Ukrainian

```yaml
  - uses: hrabiel/check-crowdin-translation-progress
  - with:
      api-token: "CrowdinPersonalAccessToken"
      organization-domain: 'myorg'
      project-id: "10"
      branch-name: "feature.my-awesome-feature"
      languages: "be,fr,uk"
      target-progress: "50"
      check-approval: false
```

# License

This project are released under the [MIT License](LICENSE)
