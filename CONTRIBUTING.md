# Contributing to StadiumSurgeSync 🤝

First off, thank you for taking the time to contribute! Your help is what makes open-source projects like StadiumSurgeSync amazing places to learn, inspire, and create.

The following is a set of guidelines for contributing to **StadiumSurgeSync**. These are guidelines, not rules. Use your best judgment and feel free to propose changes to this document in a pull request.

---

## 🚀 How Can I Contribute?

### Reporting Bugs
If you find a bug in the application (such as UI misalignment, unexpected aggregate calculation overflows, or database simulation anomalies):
- Open an Issue in the GitHub repository.
- Use a clear and descriptive title.
- Describe the exact steps required to reproduce the issue.
- Include details about your environment (browser version, Node.js version).

### Suggesting Enhancements
We are always eager to receive suggestions for new features, including:
- Additional simulated MongoDB aggregates (such as `$lookup` or `$unwind`).
- Advanced interactive diagrams and maps representing stadium layouts.
- Novel model capabilities (such as map grounding or audio alerts).
To suggest an enhancement, open a Feature Request Issue, describing the desired behavior and the target user.

### Pull Requests (PRs)
When you are ready to submit a contribution:
1. **Fork** the repository and create your branch from `main`.
2. Ensure you have installed local dependency packages.
3. Make your modifications following our code style guidelines.
4. Verify your changes are bug-free and fully compile.
5. Code MUST pass Typecheck verification:
   ```bash
   npm run lint
   ```
6. Ensure the production build generates successfully:
   ```bash
   npm run build
   ```
7. Commit your alterations with clear, descriptive commit messages.
8. Submit your Pull Request, outlining what the changes solve and linking relevant issues.

---

## 🎨 Code Style & Quality Standards

To maintain a cohesive, clean, and beautiful environment, ensure your code adheres to these guidelines:
- **TypeScript Type Safety:** Avoid using the `any` type wherever possible. Define concise interfaces for your data frames inside `types.ts`.
- **Formatting & Spacing:** Use standard 2-space indentation.
- **Tailwind Utility Classes:** Utilize responsive utility layouts (`sm:`, `md:`, `lg:`) and follow high-contrast display conventions.
- **Plain English Conversational Outputs:** Responses synthesized from the system should maintain the friendly, polite, conversational tone and strictly avoid markdown formatting (such as bold markers or list items) as required by our parsing engines.

Thank you for contributing! Your support is highly appreciated.
