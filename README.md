# ELITEA Code


Introducing ELITEA Code for VSCode, the ultimate AI-powered IDE extension that revolutionizes the way you develop, test, and maintain your code. ELITEA Code harnesses the power of generative AI to provide intelligent suggestions, streamline code implementation, and automate essential tasks, elevating your coding experience to new heights. With customizable internal and external prompts, ELITEA Code offers an unparalleled level of adaptability, catering to your unique project needs and preferences.

# Why ELITEA Code?

## Boost productivity with AI-powered suggestions

ELITEA Code intelligently analyzes your code and provides real-time suggestions for implementing features, enhancing code readability, and optimizing performance. Save time and effort while crafting high-quality code.

## Automate testing and documentation

Generate unit-tests, integration tests, and automated tests with ease, ensuring your code is robust and reliable. ELITEA Code also automatically adds comments to your code, making it more understandable and maintainable for your team.

## Customizable prompts for personalized assistance

Tailor ELITEA Code to your specific needs with customizable internal and external prompts. Create and modify prompts within your IDE, or leverage the power of ELITEA Backend's large language model for external prompts, offering an unparalleled level of adaptability.


# Features list:

- AI-powered code suggestions
- Automated unit-test generation
- Integration test generation
- Automated test creation
- Automatic code commenting
- Customizable internal prompts
- Project-specific external prompts powered by ELITEA Backend
- Code explanation and optimization recommendations
- Native IDE integration
- Regular updates and improvements
- Comprehensive documentation and support
- Collaboration-friendly design for team projects
- Secure and privacy-conscious implementation

# Extension Commands
- Elitea: Init - Initialize ELITEA Code and create .promptLib folder in a root of your open workspace
- Elitea: Create Prompt - Create a new prompt in .promptLib folder
- Elitea: Extend Context - Extend context of the prompt in .promptLib folder
- Elitea: Predict - Provide a list of prompts to choose from and generate prediction based on the selected prompt and **its last version**
- Elitea: Sync External Prompts - Sync external prompts from ELITEA Backend

# Extension Settings

This extension contributes the following settings:
- eliteacode.enable: enable/disable this extension
- eliteacode.serviceProviderForLLM: select the LLM provider (ELITEA)
- eliteacode.LLMAuthToken: API key for the selected LLM provider
- eliteacode.LLMServerUrl: URL of the LLM provider server
- eliteacode.apiVersion: Api version, mostly applicable for Azure OpenAI compatible APIs
- eliteacode.LLMModelName: Default model name used for local prompts (Can be overwritten in prompt)
- eliteacode.projectId (optional): Project ID for external prompts (ignored for any OpenAI)
- eliteacode.integrationUid (optional): Integration UID for external prompts (ignored for any OpenAI)
- eliteacode.temperature: Default temperature for model (Can be overwritten in prompt)
- eliteacode.maxTokens: Default max tokens for model (Can be overwritten in prompt)
- eliteacode.topP: Default top P for model (Can be overwritten in prompt)
- eliteacode.topK: Default top K for model (Can be overwritten in prompt)


# Development

Run build and package and then install the generated `.vsix` 

## Build

`npm run esbuild`

## Package

`npm run vsce`

Run following and VS Code's "Run" >> "Start Debugging" to debug extension with auto rebuild.

## Development

`npm run esbuild-watch`


